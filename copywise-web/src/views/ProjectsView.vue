<template>
  <div class="projects-page">
    <div class="projects-page__header">
      <div class="projects-page__header-left">
        <div class="projects-page__back" @click="$router.push('/')">
          <el-icon><Back /></el-icon>
          <span>返回</span>
        </div>
        <h2 class="projects-page__title">项目管理</h2>
      </div>
      <el-button type="primary" :icon="Plus" @click="handleCreate">新建项目</el-button>
    </div>

    <div v-loading="loading" class="projects-grid">
      <template v-if="projects.length">
        <div
          v-for="project in projects"
          :key="project.id"
          class="project-card"
          @click="goDetail(project.id)"
        >
          <div class="project-card__header">
            <h3 class="project-card__name">{{ project.name }}</h3>
            <el-dropdown trigger="click" @command="(cmd: string) => onAction(cmd, project)" @click.stop>
              <el-icon class="project-card__more"><MoreFilled /></el-icon>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="edit">编辑</el-dropdown-item>
                  <el-dropdown-item command="delete" divided>
                    <span class="text-danger">删除</span>
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
          <p class="project-card__desc">{{ truncate(project.productDesc, 120) }}</p>
          <div class="project-card__footer">
            <span v-if="project.targetAudience" class="project-card__audience">
              {{ truncate(project.targetAudience, 60) }}
            </span>
            <span class="project-card__date">{{ formatDate(project.createdAt) }}</span>
          </div>
        </div>
      </template>
      <el-empty v-else-if="!loading" description="暂无项目，点击上方按钮创建" />
    </div>

    <!-- 新建/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="editingProject ? '编辑项目' : '新建项目'"
      width="520px"
      destroy-on-close
      :close-on-click-modal="false"
    >
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="100px">
        <el-form-item label="项目名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入项目名称" maxlength="50" show-word-limit />
        </el-form-item>
        <el-form-item label="产品描述" prop="productDesc">
          <el-input
            v-model="form.productDesc"
            type="textarea"
            placeholder="请描述您的产品"
            :rows="4"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="目标受众" prop="targetAudience">
          <el-input
            v-model="form.targetAudience"
            type="textarea"
            placeholder="描述目标受众（选填）"
            :rows="2"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, MoreFilled, Back } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import * as projectApi from '@/api/project'
import type { Project } from '@/types/project'
import { formatDate, truncate } from '@/utils/format'

const router = useRouter()
const projects = ref<Project[]>([])
const loading = ref(false)

const dialogVisible = ref(false)
const editingProject = ref<Project | null>(null)
const submitting = ref(false)
const formRef = ref<FormInstance>()
const form = reactive({
  name: '',
  productDesc: '',
  targetAudience: '',
})

const formRules: FormRules = {
  name: [
    { required: true, message: '请输入项目名称', trigger: 'blur' },
    { max: 50, message: '不可超过 50 字', trigger: 'blur' },
  ],
  productDesc: [
    { required: true, message: '请输入产品描述', trigger: 'blur' },
    { max: 500, message: '不可超过 500 字', trigger: 'blur' },
  ],
}

const fetchProjects = async () => {
  loading.value = true
  try {
    projects.value = await projectApi.getProjectList()
  } catch {
    /* 拦截器已统一显示后端错误消息 */
  } finally {
    loading.value = false
  }
}

const goDetail = (id: number) => {
  router.push(`/projects/${id}`)
}

const handleCreate = () => {
  editingProject.value = null
  form.name = ''
  form.productDesc = ''
  form.targetAudience = ''
  dialogVisible.value = true
}

const handleSubmit = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  submitting.value = true

  try {
    if (editingProject.value) {
      await projectApi.updateProject(editingProject.value.id, {
        name: form.name,
        productDesc: form.productDesc,
        targetAudience: form.targetAudience || undefined,
      })
      ElMessage.success('更新成功')
    } else {
      await projectApi.createProject({
        name: form.name,
        productDesc: form.productDesc,
        targetAudience: form.targetAudience || undefined,
      })
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    fetchProjects()
  } catch {
    /* error handled by interceptor */
  } finally {
    submitting.value = false
  }
}

const onAction = async (cmd: string, project: Project) => {
  if (cmd === 'edit') {
    editingProject.value = project
    form.name = project.name
    form.productDesc = project.productDesc
    form.targetAudience = project.targetAudience ?? ''
    dialogVisible.value = true
  } else if (cmd === 'delete') {
    try {
      await ElMessageBox.confirm(
        `确定要删除项目「${project.name}」吗？该项目下的所有文案将被级联删除，此操作不可撤销。`,
        '删除项目',
        { type: 'warning', confirmButtonText: '确定删除', cancelButtonText: '取消' },
      )
      await projectApi.deleteProject(project.id)
      ElMessage.success('已删除')
      fetchProjects()
    } catch {
      /* 取消或出错 */
    }
  }
}

onMounted(() => {
  fetchProjects()
})
</script>

<style scoped lang="scss">
.projects-page {
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

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 32px;

    @media (max-width: 767px) {
      margin-bottom: 20px;
      flex-wrap: wrap;
    }
  }

  &__header-left {
    display: flex;
    align-items: center;
    gap: 16px;
    min-width: 0;
    flex: 1;
  }

  &__back {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: rgba(241, 242, 246, 0.56);
    font-size: 13px;
    cursor: pointer;
    user-select: none;
    white-space: nowrap;
    flex-shrink: 0;

    &:hover {
      color: #409eff;
    }
  }

  &__title {
    margin: 0;
    font-size: 24px;
    font-weight: 600;
    color: #f1f2f6;
    flex: 1;
    min-width: 0;
  }
}

.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
  min-height: 120px;

  @media (max-width: 767px) {
    grid-template-columns: 1fr;
  }
}

.project-card {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  padding: 28px;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;

  &:hover {
    border-color: rgba(64, 158, 255, 0.3);
    background: rgba(64, 158, 255, 0.04);
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;
  }

  &__name {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: #f1f2f6;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
  }

  &__more {
    color: rgba(241, 242, 246, 0.4);
    cursor: pointer;
    padding: 4px;
    flex-shrink: 0;

    &:hover {
      color: #f1f2f6;
    }
  }

  &__desc {
    margin: 0 0 18px;
    font-size: 14px;
    color: rgba(241, 242, 246, 0.6);
    line-height: 1.6;
    min-height: 48px;
  }

  &__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 13px;
    color: rgba(241, 242, 246, 0.36);
  }

  &__audience {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 60%;
  }
}

.text-danger {
  color: var(--el-color-danger);
}
</style>
