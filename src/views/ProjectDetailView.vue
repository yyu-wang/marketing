<template>
  <div class="page-container project-detail">
    <div class="project-detail__back">
      <el-button text :icon="ArrowLeft" @click="$router.push('/projects')">返回项目列表</el-button>
    </div>

    <el-skeleton v-if="loading" :rows="8" animated />

    <template v-else-if="project">
      <el-card class="project-detail__summary" shadow="never">
        <div class="project-detail__summary-head">
          <div>
            <h2>{{ project.name }}</h2>
            <p class="text-muted">{{ project.productDesc }}</p>
            <div v-if="project.targetAudience" class="project-detail__audience">
              <el-icon><User /></el-icon>
              <span>目标人群：{{ project.targetAudience }}</span>
            </div>
          </div>
          <div class="project-detail__summary-actions">
            <el-button :icon="Edit" @click="onEdit">编辑项目</el-button>
            <el-button :icon="Delete" type="danger" plain @click="onDelete">删除项目</el-button>
          </div>
        </div>
      </el-card>

      <GeneratePanel
        class="mt-16"
        :project-id="project.id"
        @copy="onCopyGenerated"
      />

      <el-card class="project-detail__copies mt-16" shadow="never">
        <template #header>
          <CopyToolbar
            v-model:channel="filter.channel"
            v-model:order="filter.order"
            :selected-count="selectedIds.size"
            @refresh="fetchCopies"
            @batch-delete="onBatchDelete"
          />
        </template>

        <el-skeleton v-if="copiesLoading" :rows="4" animated />
        <el-empty v-else-if="copies.length === 0" description="暂无文案，使用上方面板生成第一条吧。" />
        <div v-else class="project-detail__copy-list">
          <CopyCard
            v-for="copy in copies"
            :key="copy.id"
            :copy="copy"
            :selected="selectedIds.has(copy.id)"
            @star="onToggleStar"
            @edit="onEditCopy"
            @delete="onDeleteCopy"
            @toggle-select="(v) => onToggleSelect(copy.id, v)"
          />
        </div>
      </el-card>
    </template>

    <ProjectFormDialog v-model="editDialogVisible" :project="project" @saved="onProjectSaved" />
    <CopyEditDialog v-model="copyDialogVisible" :copy="editingCopy" @saved="onCopySaved" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Delete, Edit, User } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { deleteProject, getProject } from '@/api/project'
import {
  batchDeleteCopies,
  deleteCopy,
  listCopies,
  toggleStar,
} from '@/api/copy'
import CopyCard from '@/components/copy/CopyCard.vue'
import CopyEditDialog from '@/components/copy/CopyEditDialog.vue'
import CopyToolbar from '@/components/copy/CopyToolbar.vue'
import GeneratePanel from '@/components/ai/GeneratePanel.vue'
import ProjectFormDialog from '@/components/project/ProjectFormDialog.vue'
import { CopyChannel } from '@/types/copy'
import type { Copy } from '@/types/copy'
import type { Project } from '@/types/project'

const props = defineProps<{
  id: number
}>()

const router = useRouter()

const loading = ref(false)
const copiesLoading = ref(false)
const project = ref<Project | null>(null)
const copies = ref<Copy[]>([])
const selectedIds = ref<Set<number>>(new Set())

const filter = reactive<{ channel: CopyChannel | ''; order: 'asc' | 'desc' }>({
  channel: '',
  order: 'desc',
})

const editDialogVisible = ref(false)
const copyDialogVisible = ref(false)
const editingCopy = ref<Copy | null>(null)

const fetchProject = async () => {
  loading.value = true
  try {
    project.value = await getProject(props.id)
  } finally {
    loading.value = false
  }
}

const fetchCopies = async () => {
  if (!project.value) return
  copiesLoading.value = true
  try {
    copies.value = await listCopies(project.value.id, {
      channel: filter.channel || undefined,
      order: filter.order,
    })
    selectedIds.value = new Set()
  } finally {
    copiesLoading.value = false
  }
}

watch(
  () => [filter.channel, filter.order],
  () => {
    void fetchCopies()
  },
)

const onEdit = () => {
  editDialogVisible.value = true
}

const onProjectSaved = (saved: Project) => {
  project.value = saved
}

const onDelete = async () => {
  if (!project.value) return
  try {
    await ElMessageBox.confirm(
      `删除项目「${project.value.name}」后，其下所有文案也会被删除，是否继续？`,
      '删除确认',
      { type: 'warning', confirmButtonText: '删除', confirmButtonClass: 'el-button--danger' },
    )
    await deleteProject(project.value.id)
    ElMessage.success('已删除')
    await router.replace('/projects')
  } catch {
    /* 取消 */
  }
}

const onCopyGenerated = (copy: Copy) => {
  copies.value = [copy, ...copies.value]
}

const onToggleStar = async (copy: Copy) => {
  try {
    const updated = await toggleStar(copy.id, !copy.isStarred)
    const idx = copies.value.findIndex((c) => c.id === copy.id)
    if (idx >= 0) copies.value[idx] = updated
  } catch {
    /* 拦截器提示 */
  }
}

const onEditCopy = (copy: Copy) => {
  editingCopy.value = copy
  copyDialogVisible.value = true
}

const onCopySaved = (updated: Copy) => {
  const idx = copies.value.findIndex((c) => c.id === updated.id)
  if (idx >= 0) copies.value[idx] = updated
}

const onDeleteCopy = async (copy: Copy) => {
  try {
    await ElMessageBox.confirm('确定删除这条文案？', '删除确认', {
      type: 'warning',
      confirmButtonText: '删除',
      confirmButtonClass: 'el-button--danger',
    })
    await deleteCopy(copy.id)
    copies.value = copies.value.filter((c) => c.id !== copy.id)
    selectedIds.value.delete(copy.id)
    ElMessage.success('已删除')
  } catch {
    /* 取消 */
  }
}

const onToggleSelect = (id: number, value: boolean) => {
  const next = new Set(selectedIds.value)
  if (value) next.add(id)
  else next.delete(id)
  selectedIds.value = next
}

const onBatchDelete = async () => {
  if (selectedIds.value.size === 0) return
  try {
    await ElMessageBox.confirm(
      `确认删除已选 ${selectedIds.value.size} 条文案？`,
      '批量删除',
      { type: 'warning', confirmButtonText: '删除', confirmButtonClass: 'el-button--danger' },
    )
    const ids = Array.from(selectedIds.value)
    const result = await batchDeleteCopies(ids)
    ElMessage.success(`已删除 ${result.deleted} 条`)
    copies.value = copies.value.filter((c) => !selectedIds.value.has(c.id))
    selectedIds.value = new Set()
  } catch {
    /* 取消 */
  }
}

onMounted(async () => {
  await fetchProject()
  await fetchCopies()
})
</script>

<style scoped lang="scss">
.project-detail {
  &__back {
    margin-bottom: 12px;
  }

  &__summary {
    h2 {
      margin: 0 0 8px;
      font-size: 22px;
    }
  }

  &__summary-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 24px;
    flex-wrap: wrap;
  }

  &__summary-actions {
    display: flex;
    gap: 8px;
  }

  &__audience {
    margin-top: 10px;
    color: #909399;
    font-size: 13px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  &__copy-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
}
</style>
