<template>
  <div class="page-container projects-view">
    <div class="projects-view__header">
      <div>
        <h1>我的项目</h1>
        <p>创建产品项目，围绕不同渠道生成营销文案。</p>
      </div>
      <el-button type="primary" :icon="Plus" @click="openCreate">新建项目</el-button>
    </div>

    <el-skeleton v-if="loading" :rows="6" animated />
    <el-empty v-else-if="projects.length === 0" description="暂无项目，创建第一个项目开始生成文案">
      <el-button type="primary" :icon="Plus" @click="openCreate">新建项目</el-button>
    </el-empty>
    <div v-else class="projects-grid">
      <ProjectCard
        v-for="project in projects"
        :key="project.id"
        :project="project"
        @edit="openEdit"
        @delete="onDelete"
      />
    </div>

    <ProjectFormDialog v-model="dialogVisible" :project="editingProject" @saved="onSaved" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { deleteProject, listProjects } from '@/api/project'
import ProjectCard from '@/components/project/ProjectCard.vue'
import ProjectFormDialog from '@/components/project/ProjectFormDialog.vue'
import type { Project } from '@/types/project'

const loading = ref(false)
const projects = ref<Project[]>([])
const dialogVisible = ref(false)
const editingProject = ref<Project | null>(null)

const fetchProjects = async () => {
  loading.value = true
  try {
    projects.value = await listProjects()
  } finally {
    loading.value = false
  }
}

const openCreate = () => {
  editingProject.value = null
  dialogVisible.value = true
}

const openEdit = (project: Project) => {
  editingProject.value = project
  dialogVisible.value = true
}

const onSaved = async () => {
  await fetchProjects()
}

const onDelete = async (project: Project) => {
  try {
    await ElMessageBox.confirm(
      `删除项目「${project.name}」后，其下所有文案也会被删除，是否继续？`,
      '删除确认',
      { type: 'warning', confirmButtonText: '删除', confirmButtonClass: 'el-button--danger' },
    )
    await deleteProject(project.id)
    ElMessage.success('已删除')
    await fetchProjects()
  } catch {
    /* 取消或拦截器提示 */
  }
}

onMounted(fetchProjects)
</script>

<style scoped lang="scss">
.projects-view {
  &__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 24px;
    margin-bottom: 24px;

    h1 {
      margin: 0 0 8px;
      font-size: 26px;
    }
    p {
      margin: 0;
      color: #646a73;
    }
  }
}

.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 18px;
}
</style>
