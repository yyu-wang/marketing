<template>
  <div
    class="message-bubble"
    :class="[`message-bubble--${message.role}`]"
  >
    <template v-if="message.role === 'user'">
      <div class="message-bubble__card message-bubble__card--user">
        <div
          v-if="message.imageUrls && message.imageUrls.length > 0"
          class="message-bubble__image-grid"
        >
          <div
            v-for="(url, idx) in message.imageUrls"
            :key="idx"
            class="message-bubble__image"
          >
            <el-image
              :src="url"
              :preview-src-list="message.imageUrls"
              fit="scale-down"
              preview-teleported
            />
          </div>
        </div>

        <div
          v-if="message.imageUrls && message.imageUrls.length > 0 && message.content"
          class="message-bubble__separator"
        />

        <!-- 编辑模式 -->
        <div v-if="isEditing" class="message-bubble__edit-area">
          <el-input
            ref="editInputRef"
            v-model="editText"
            type="textarea"
            :rows="3"
            maxlength="2000"
            @keyup.enter.ctrl="confirmEdit"
          />
          <div class="message-bubble__edit-actions">
            <el-button size="small" @click="cancelEdit">取消</el-button>
            <el-button size="small" type="primary" :loading="editLoading" @click="confirmEdit">
              确认并重新生成
            </el-button>
          </div>
        </div>

        <div v-else-if="message.content" class="message-bubble__text">
          {{ message.content }}
        </div>

        <!-- 操作栏 -->
        <div
          v-if="!isEditing && message.content"
          class="message-bubble__user-actions"
        >
          <el-button link size="small" @click="startEdit">
            <el-icon><Edit /></el-icon>
          </el-button>
        </div>
      </div>
    </template>

    <template v-else>
      <div class="message-bubble__avatar">
        <span class="message-bubble__bot">AI</span>
      </div>
      <div
        class="message-bubble__card message-bubble__card--assistant"
        :class="{ 'message-bubble__card--text-only': message.status === 'done' }"
      >
        <div
          v-if="message.status === 'streaming'"
          class="message-bubble__text message-bubble__streaming"
        >
          <template v-if="streamingDelta">
            {{ streamingDelta }}<span class="message-bubble__caret" />
          </template>
          <template v-else>
            <el-icon class="is-loading"><Loading /></el-icon>
            <span>正在思考...</span>
          </template>
        </div>

        <div v-else-if="message.status === 'pending'" class="message-bubble__text">
          <el-icon class="is-loading"><Loading /></el-icon>
          <span>排队中...</span>
        </div>

        <div v-else-if="message.status === 'done'" class="message-bubble__text">
          <div class="message-bubble__text-body">{{ message.content }}</div>
        </div>

        <div v-else class="message-bubble__error">
          <div v-if="message.content" class="message-bubble__text message-bubble__text--partial">
            {{ message.content }}
          </div>
          <div class="message-bubble__error-bar">
            <el-icon><WarningFilled /></el-icon>
            <span>{{ message.errorMessage || '生成失败' }}</span>
          </div>
        </div>

        <div
          v-if="message.status === 'done' || message.status === 'error'"
          class="message-bubble__actions"
        >
          <CopyButton v-if="message.status === 'done'" :text="message.content || ''" />
          <template v-if="message.status === 'error' && onRetry">
            <el-button class="action-btn action-btn--retry" size="small" @click="onRetry">
              <el-icon><RefreshRight /></el-icon>
              <span class="action-btn__text">{{ message.errorMessage === '已中止生成' ? '继续' : '重试' }}</span>
            </el-button>
          </template>
          <!-- 保存到项目 -->
          <el-button
            v-if="message.role === 'assistant' && message.status === 'done'"
            class="action-btn"
            size="small"
            @click="openSaveDialog"
          >
            <el-icon><FolderAdd /></el-icon>
            <span class="action-btn__text">保存</span>
          </el-button>
          <!-- 版本历史 -->
          <el-dropdown
            v-if="message.role === 'assistant' && message.status === 'done'"
            trigger="click"
            @command="(versionId: number) => handleRestoreVersion(versionId)"
            @visible-change="onVersionDropdownVisible"
          >
            <el-button class="action-btn" size="small">
              <el-icon><Clock /></el-icon>
              <span class="action-btn__text">版本</span>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item v-if="versions.length === 0" disabled>暂无历史版本</el-dropdown-item>
                <el-dropdown-item
                  v-for="v in versions"
                  :key="v.id"
                  :command="v.id"
                >
                  <span>版本 {{ v.version }}</span>
                  <span class="version-date">{{ formatDate(v.createdAt) }}</span>
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
    </template>

    <!-- 保存到项目对话框 -->
    <el-dialog
      v-model="saveDialogVisible"
      title="保存到项目"
      width="420px"
      :close-on-click-modal="false"
    >
      <el-form label-width="80px">
        <el-form-item label="选择项目">
          <el-select v-model="saveProjectId" placeholder="请选择项目" style="width: 100%" filterable>
            <el-option
              v-for="p in projectOptions"
              :key="p.id"
              :label="p.name"
              :value="p.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="saveDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saveLoading" @click="handleSaveToProject">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { Clock, Edit, FolderAdd, Loading, RefreshRight, WarningFilled } from '@element-plus/icons-vue'
import CopyButton from '@/components/common/CopyButton.vue'
import { getMessageVersions, restoreMessageVersion } from '@/api/conversation'
import { saveMessageToProject } from '@/api/copy'
import { getProjectList } from '@/api/project'
import { useConversationStore } from '@/stores/conversation'
import { formatDate } from '@/utils/format'
import type { Message } from '@/types/conversation'

const props = defineProps<{
  message: Message
  streamingDelta?: string
  onRetry?: () => void
}>()

const store = useConversationStore()
const isEditing = ref(false)
const editText = ref('')
const editLoading = ref(false)
const editInputRef = ref<InstanceType<typeof import('element-plus').ElInput> | null>(null)

const startEdit = () => {
  editText.value = props.message.content ?? ''
  isEditing.value = true
  void nextTick(() => {
    editInputRef.value?.focus()
  })
}

const cancelEdit = () => {
  isEditing.value = false
  editText.value = ''
}

const confirmEdit = async () => {
  if (!editText.value.trim()) {
    ElMessage.warning('内容不能为空')
    return
  }
  editLoading.value = true
  try {
    await store.editAndResend(props.message.id, editText.value.trim())
    isEditing.value = false
  } catch {
    /* error handled by interceptor */
  } finally {
    editLoading.value = false
  }
}

// 版本管理
interface MessageVersion {
  id: number
  version: number
  content: string
  createdAt: string
}
const versions = ref<MessageVersion[]>([])

const onVersionDropdownVisible = async (visible: boolean) => {
  if (!visible) return
  if (!store.current) return
  try {
    versions.value = await getMessageVersions(store.current.id, props.message.id)
  } catch {
    /* ignore */
  }
}

const handleRestoreVersion = async (versionId: number) => {
  if (!store.current) return
  try {
    const result = await restoreMessageVersion(store.current.id, props.message.id, versionId)
    const msg = store.findMessage(props.message.id)
    if (msg) {
      msg.content = result.content
    }
    ElMessage.success('已恢复到选中版本')
  } catch {
    /* ignore */
  }
}

// 保存到项目
const saveDialogVisible = ref(false)
const saveProjectId = ref<number | null>(null)
const saveLoading = ref(false)
const projectOptions = ref<Array<{ id: number; name: string }>>([])

const openSaveDialog = async () => {
  saveProjectId.value = null
  saveDialogVisible.value = true
  try {
    projectOptions.value = await getProjectList()
  } catch {
    /* ignore */
  }
}

const handleSaveToProject = async () => {
  if (!saveProjectId.value) {
    ElMessage.warning('请选择项目')
    return
  }
  saveLoading.value = true
  try {
    await saveMessageToProject(props.message.id, saveProjectId.value)
    ElMessage.success('已保存到项目')
    saveDialogVisible.value = false
  } catch {
    /* ignore */
  } finally {
    saveLoading.value = false
  }
}
</script>

<style scoped lang="scss">
@use '@/styles/variables.scss' as *;

.message-bubble {
  max-width: 100%;

  &--user {
    display: flex;
    justify-content: flex-end;
  }

  &--assistant {
  }

  &__avatar {
    width: 36px;
    height: 36px;
    border-radius: 12px;
    background: $bg-card;
    border: 1px solid $border-color;
    display: flex;
    align-items: center;
    justify-content: center;
    color: $text-primary;
    margin-bottom: 8px;
    margin-left: 12px;
  }

  &__bot {
    background: $primary-gradient;
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    font-weight: 700;
    font-size: 13px;
  }

  &__card {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 12px;
    border-radius: 18px;
    background: $bg-card;
    border: 1px solid $border-color;
  }

  &__card--user {
    background: rgba(124, 92, 255, 0.15);
    border-color: rgba(124, 92, 255, 0.3);
    max-width: 66.67%;
  }

  &__card--assistant {
    background: transparent;
    border: none;
    padding: 0 12px;
    max-width: 100%;
  }

  &__image-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  &__image {
    position: relative;
    overflow: hidden;
    border-radius: 16px;
    cursor: zoom-in;
    display: flex;
    align-items: center;
    justify-content: center;
    max-width: 200px;
    max-height: 200px;
    width: min(100%, 200px);
    aspect-ratio: 1 / 1;
    background: rgba(255, 255, 255, 0.04);

    img {
      display: block;
      width: auto;
      height: auto;
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      object-position: center;
    }
  }

  &__separator {
    width: 100%;
    height: 1px;
    background: rgba(255, 255, 255, 0.08);
    margin: 10px 0;
  }

  .message-preview-dialog {
    text-align: center;

    img {
      max-width: 100%;
      max-height: 80vh;
      border-radius: 14px;
    }
  }

  &__text {
    padding: 0;
    border: none;
    background: transparent;
    color: $text-primary;
    font-size: 14px;
    line-height: 1.7;
    white-space: pre-wrap;
    word-break: break-word;
  }

  &__text-body {
    min-width: 0;
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: 6px;
    padding-top: 4px;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    margin-top: 2px;
  }

  &__streaming {
    background: transparent;
  }

  &__caret {
    display: inline-block;
    width: 6px;
    height: 16px;
    margin-left: 2px;
    vertical-align: text-bottom;
    background: $primary-color;
    border-radius: 1px;
    animation: caret-blink 0.9s steps(2) infinite;
  }

  &__error {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__text--partial {
    padding: 12px;
    border-radius: 14px;
    background: $bg-card;
    border: 1px solid $border-color;
    color: $text-secondary;
    font-size: 14px;
    line-height: 1.7;
    white-space: pre-wrap;
    word-break: break-word;
  }

  &__error-bar {
    display: inline-flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    padding: 8px 14px;
    border-radius: 14px;
    background: rgba(248, 113, 113, 0.12);
    border: none;
    color: $color-danger;
    font-size: 13px;

    span {
      white-space: pre-wrap;
    }
  }

  &__user-actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 4px;
    opacity: 0.4;
    transition: opacity 0.2s;

    &:hover {
      opacity: 1;
    }
  }

  &__edit-area {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 320px;
  }

  &__edit-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }
}

.version-date {
  font-size: 11px;
  color: $text-muted;
  margin-left: 8px;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 28px;
  padding: 0 8px;
  border-radius: 8px;
  background: transparent;
  border: none;
  color: $text-secondary;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;

  &__text {
    max-width: 0;
    opacity: 0;
    overflow: hidden;
    white-space: nowrap;
    transition: all 0.2s ease;
  }

  &:hover {
    background: rgba(124, 92, 255, 0.12);
    color: $primary-color;

    .action-btn__text {
      max-width: 40px;
      opacity: 1;
    }
  }

  &--retry:hover {
    background: rgba(248, 113, 113, 0.12);
    color: $color-danger;
  }
}

@keyframes caret-blink {
  0%, 100% { opacity: 0; }
  50% { opacity: 1; }
}
</style>
