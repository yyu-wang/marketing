<template>
  <Teleport to="body">
    <el-dialog
      v-model="visible"
      title="历史版本"
      width="960px"
      top="5vh"
      :close-on-click-modal="false"
    >
      <div v-if="loading" class="vh-loading">
        <el-icon class="is-loading" :size="24"><Loading /></el-icon>
      </div>
      <div v-else-if="versionList.length === 0" class="vh-empty">
        暂无历史版本
      </div>
      <div v-else class="vh-body">
        <div class="vh-list">
          <div
            v-for="v in versionList"
            :key="v.id"
            class="vh-item"
            :class="{ 'vh-item--active': selectedId === v.id }"
            @click="selectVersion(v)"
          >
            <span class="vh-item__label">版本 {{ v.version }}</span>
            <span class="vh-item__date">{{ formatDate(v.createdAt) }}</span>
          </div>
        </div>
        <div class="vh-preview">
          <div v-if="selectedVersion" class="vh-preview__inner">
            <div class="vh-preview__section">
              <div class="vh-preview__label">提问</div>
              <div class="vh-preview__content vh-preview__content--user">
                {{ selectedVersion.userContent || '(无提问记录)' }}
              </div>
            </div>
            <div class="vh-preview__section">
              <div class="vh-preview__label">回答</div>
              <div class="vh-preview__content vh-preview__content--assistant">
                {{ selectedVersion.content }}
              </div>
            </div>
          </div>
          <div v-else class="vh-preview__empty">请选择左侧版本查看内容</div>
        </div>
      </div>
      <template #footer>
        <el-button @click="visible = false">关闭</el-button>
        <el-button
          type="primary"
          :loading="restoring"
          :disabled="!selectedId"
          @click="handleRestore"
        >
          恢复到此版本
        </el-button>
      </template>
    </el-dialog>
  </Teleport>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Loading } from '@element-plus/icons-vue'
import { getMessageVersions, restoreMessageVersion } from '@/api/conversation'
import { useConversationStore } from '@/stores/conversation'
import { formatDate } from '@/utils/format'

interface VersionItem {
  id: number
  version: number
  content: string
  userContent: string | null
  createdAt: string
}

const props = defineProps<{
  modelValue: boolean
  conversationId: number
  messageId: number
  userMessageId: number
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
}>()

const store = useConversationStore()

const visible = ref(props.modelValue)
const loading = ref(false)
const restoring = ref(false)
const versionList = ref<VersionItem[]>([])
const selectedId = ref<number | null>(null)
const selectedVersion = ref<VersionItem | null>(null)

onMounted(() => {
  if (props.modelValue) void loadVersions()
})

watch(() => props.modelValue, (val) => {
  visible.value = val
  if (val) void loadVersions()
})
watch(visible, (val) => {
  emit('update:modelValue', val)
})

const loadVersions = async () => {
  loading.value = true
  selectedId.value = null
  selectedVersion.value = null
  try {
    versionList.value = await getMessageVersions(props.conversationId, props.messageId)
    if (versionList.value.length > 0) {
      selectVersion(versionList.value[0])
    }
  } catch {
    versionList.value = []
  } finally {
    loading.value = false
  }
}

const selectVersion = (v: VersionItem) => {
  selectedId.value = v.id
  selectedVersion.value = v
}

const handleRestore = async () => {
  if (!selectedId.value) return
  restoring.value = true
  try {
    const result = await restoreMessageVersion(
      props.conversationId,
      props.messageId,
      selectedId.value,
    )
    await store.reloadCurrent()
    ElMessage.success('已恢复到选中版本')
    visible.value = false
  } catch {
    ElMessage.error('恢复失败')
  } finally {
    restoring.value = false
  }
}
</script>

<style scoped lang="scss">
@use '@/styles/variables.scss' as *;

.vh-loading,
.vh-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
  color: $text-muted;
  font-size: 14px;
}

.vh-body {
  display: flex;
  gap: 0;
  height: 520px;
  border: 1px solid $border-color;
  border-radius: 8px;
  overflow: hidden;
}

.vh-list {
  width: 200px;
  flex-shrink: 0;
  overflow-y: auto;
  border-right: 1px solid $border-color;
  background: rgba(255, 255, 255, 0.02);
}

.vh-item {
  padding: 12px 14px;
  cursor: pointer;
  transition: background 0.15s;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);

  &:hover {
    background: rgba(124, 92, 255, 0.08);
  }

  &--active {
    background: rgba(124, 92, 255, 0.15);
    border-left: 3px solid $primary-color;
    padding-left: 11px;
  }

  &__label {
    display: block;
    font-size: 13px;
    color: $text-primary;
    margin-bottom: 4px;
  }

  &__date {
    font-size: 11px;
    color: $text-muted;
  }
}

.vh-preview {
  flex: 1;
  overflow-y: auto;
  padding: 16px;

  &__empty {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: $text-muted;
    font-size: 13px;
  }

  &__inner {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  &__section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__label {
    font-size: 12px;
    color: $text-muted;
    font-weight: 500;
  }

  &__content {
    padding: 12px 14px;
    border-radius: 10px;
    font-size: 13px;
    line-height: 1.65;
    white-space: pre-wrap;
    word-break: break-word;
    color: $text-primary;

    &--user {
      background: rgba(124, 92, 255, 0.1);
      border: 1px solid rgba(124, 92, 255, 0.2);
    }

    &--assistant {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid $border-color;
    }
  }
}
</style>
