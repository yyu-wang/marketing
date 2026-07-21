<template>
  <div class="project-detail">
    <!-- 项目信息卡片 -->
    <div class="project-detail__info">
      <div class="project-detail__info-left">
        <el-button text :icon="ArrowLeft" @click="$router.push('/projects')">返回</el-button>
        <div>
          <h2 class="project-detail__name">{{ project?.name }}</h2>
          <p class="project-detail__desc">{{ project?.productDesc }}</p>
        </div>
      </div>
      <el-tag v-if="project?.targetAudience" size="small" effect="plain">
        受众：{{ project.targetAudience }}
      </el-tag>
    </div>

    <!-- 工具栏 -->
    <div class="project-detail__toolbar">
      <div class="project-detail__tabs">
        <el-radio-group v-model="channelFilter" size="small" @change="fetchCopies">
          <el-radio-button value="">全部</el-radio-button>
          <el-radio-button value="xiaohongshu">小红书</el-radio-button>
          <el-radio-button value="moments">朋友圈</el-radio-button>
          <el-radio-button value="ad_slogan">广告语</el-radio-button>
        </el-radio-group>
      </div>
      <div class="project-detail__actions">
        <el-select v-model="sortOrder" size="small" style="width: 100px" @change="fetchCopies">
          <el-option label="最新优先" value="desc" />
          <el-option label="最早优先" value="asc" />
        </el-select>
        <el-button
          v-if="selectedIds.length > 0"
          type="danger"
          size="small"
          @click="handleBatchDelete"
        >
          删除选中 ({{ selectedIds.length }})
        </el-button>
      </div>
    </div>

    <!-- 文案列表 -->
    <div v-loading="loading" class="project-detail__copies">
      <template v-if="copies.length">
        <div
          v-for="copy in copies"
          :key="copy.id"
          class="copy-card"
          :class="{ 'is-selected': selectedIds.includes(copy.id) }"
        >
          <div class="copy-card__checkbox">
            <el-checkbox
              :model-value="selectedIds.includes(copy.id)"
              @change="toggleSelect(copy.id)"
            />
          </div>
          <div class="copy-card__body">
            <p class="copy-card__content">{{ copy.content }}</p>
            <div class="copy-card__meta">
              <el-tag size="small" type="info">
                {{ CHANNEL_LABELS[copy.channel as ChannelKey] || copy.channel }}
              </el-tag>
              <el-tag v-if="copy.isEdited" size="small" type="warning" effect="plain">已编辑</el-tag>
              <span class="copy-card__date">{{ formatDateTime(copy.createdAt) }}</span>
            </div>
          </div>
          <div class="copy-card__ops">
            <el-button link size="small" @click="handleEdit(copy)">
              <el-icon><Edit /></el-icon>
            </el-button>
            <el-button
              link
              size="small"
              :type="copy.isStarred ? 'warning' : 'default'"
              @click="handleToggleStar(copy)"
            >
              <el-icon><StarFilled v-if="copy.isStarred" /><Star v-else /></el-icon>
            </el-button>
            <el-button link size="small" type="danger" @click="handleDelete(copy)">
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
        </div>
      </template>
      <el-empty v-else-if="!loading" description="暂无文案" :image-size="80" />
    </div>

    <!-- 编辑对话框 -->
    <el-dialog
      v-model="editDialogVisible"
      title="编辑文案"
      width="520px"
      destroy-on-close
      :close-on-click-modal="false"
    >
      <el-form ref="editFormRef" :model="editForm" :rules="editFormRules">
        <el-form-item prop="content">
          <el-input
            v-model="editForm.content"
            type="textarea"
            :rows="6"
            maxlength="1000"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="editSubmitting" @click="handleEditSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import {
  ArrowLeft, Edit, Star, StarFilled, Delete,
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import * as projectApi from '@/api/project'
import * as copyApi from '@/api/copy'
import type { Project } from '@/types/project'
import type { Copy } from '@/types/copy'
import { formatDateTime } from '@/utils/format'

type ChannelKey = 'xiaohongshu' | 'moments' | 'ad_slogan'

const CHANNEL_LABELS: Record<ChannelKey, string> = {
  xiaohongshu: '小红书',
  moments: '朋友圈',
  ad_slogan: '广告语',
}

const route = useRoute()
const projectId = Number(route.params.id)

const project = ref<Project | null>(null)
const copies = ref<Copy[]>([])
const channelFilter = ref('')
const sortOrder = ref<'asc' | 'desc'>('desc')
const selectedIds = ref<number[]>([])
const loading = ref(false)

const toggleSelect = (id: number) => {
  const idx = selectedIds.value.indexOf(id)
  if (idx > -1) {
    selectedIds.value.splice(idx, 1)
  } else {
    selectedIds.value.push(id)
  }
}

const fetchProject = async () => {
  try {
    project.value = await projectApi.getProject(projectId)
  } catch {
    ElMessage.error('项目不存在或无权访问')
  }
}

const fetchCopies = async () => {
  loading.value = true
  selectedIds.value = []
  try {
    copies.value = await copyApi.getCopyList(projectId, {
      channel: channelFilter.value || undefined,
      order: sortOrder.value,
    })
  } catch {
    ElMessage.error('获取文案列表失败')
  } finally {
    loading.value = false
  }
}

const handleToggleStar = async (copy: Copy) => {
  try {
    const updated = await copyApi.toggleStar(copy.id)
    copy.isStarred = updated.isStarred
  } catch {
    /* error handled by interceptor */
  }
}

const handleDelete = async (copy: Copy) => {
  try {
    await ElMessageBox.confirm('确定删除这条文案吗？', '删除确认', { type: 'warning' })
    await copyApi.deleteCopy(copy.id)
    ElMessage.success('已删除')
    fetchCopies()
  } catch {
    /* 取消或出错 */
  }
}

const handleBatchDelete = async () => {
  try {
    await ElMessageBox.confirm(
      `确定删除选中的 ${selectedIds.value.length} 条文案吗？`,
      '批量删除',
      { type: 'warning' },
    )
    const result = await copyApi.batchDeleteCopies(selectedIds.value)
    ElMessage.success(`成功删除 ${result.deleted} 条`)
    fetchCopies()
  } catch {
    /* 取消或出错 */
  }
}

const editDialogVisible = ref(false)
const editingCopy = ref<Copy | null>(null)
const editSubmitting = ref(false)
const editFormRef = ref<FormInstance>()
const editForm = reactive({ content: '' })
const editFormRules: FormRules = {
  content: [
    { required: true, message: '请输入内容', trigger: 'blur' },
    { max: 1000, message: '不可超过 1000 字', trigger: 'blur' },
  ],
}

const handleEdit = (copy: Copy) => {
  editingCopy.value = copy
  editForm.content = copy.content
  editDialogVisible.value = true
}

const handleEditSubmit = async () => {
  const valid = await editFormRef.value?.validate().catch(() => false)
  if (!valid || !editingCopy.value) return
  editSubmitting.value = true
  try {
    await copyApi.updateCopy(editingCopy.value.id, { content: editForm.content })
    ElMessage.success('已保存')
    editDialogVisible.value = false
    fetchCopies()
  } catch {
    /* error handled by interceptor */
  } finally {
    editSubmitting.value = false
  }
}

onMounted(() => {
  fetchProject()
  fetchCopies()
})
</script>

<style scoped lang="scss">
.project-detail {
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 40px 32px;
  box-sizing: border-box;
  flex: 1;
  overflow-y: auto;

  @media (max-width: 767px) {
    padding: 16px;
  }

  &__info {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    padding: 20px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 12px;
    margin-bottom: 20px;

    @media (max-width: 767px) {
      flex-direction: column;
    }
  }

  &__info-left {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    flex: 1;
  }

  &__name {
    margin: 0 0 6px;
    font-size: 18px;
    font-weight: 600;
    color: #f1f2f6;
  }

  &__desc {
    margin: 0;
    font-size: 13px;
    color: rgba(241, 242, 246, 0.6);
    line-height: 1.6;
  }

  &__toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
    flex-wrap: wrap;
    gap: 12px;
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__copies {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 16px;
    min-height: 120px;

    @media (max-width: 767px) {
      grid-template-columns: 1fr;
    }
  }
}

.copy-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  transition: border-color 0.2s, background 0.2s;

  &:hover {
    border-color: rgba(64, 158, 255, 0.25);
    background: rgba(64, 158, 255, 0.04);
  }

  &.is-selected {
    border-color: rgba(64, 158, 255, 0.35);
    background: rgba(64, 158, 255, 0.07);
  }

  &__checkbox {
    align-self: flex-start;
    padding-top: 2px;
  }

  &__body {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
  }

  &__content {
    margin: 0;
    font-size: 14px;
    color: rgba(241, 242, 246, 0.9);
    line-height: 1.8;
    white-space: pre-wrap;
  }

  &__meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
  }

  &__date {
    font-size: 12px;
    color: rgba(241, 242, 246, 0.36);
    margin-left: auto;
  }

  &__ops {
    display: flex;
    align-items: center;
    gap: 6px;
    justify-content: flex-end;
    flex-wrap: wrap;
  }

  @media (max-width: 767px) {
    & {
      padding: 16px;
    }

    &__date {
      margin-left: 0;
    }

    &__ops {
      justify-content: flex-start;
      width: 100%;
    }
  }
}
</style>
