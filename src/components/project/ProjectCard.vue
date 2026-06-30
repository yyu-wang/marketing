<template>
  <el-card class="project-card" shadow="hover" @click="onView">
    <div class="project-card__header">
      <h3 class="project-card__title">{{ project.name }}</h3>
      <el-dropdown trigger="click" @click.stop @command="onCommand">
        <el-button text :icon="MoreFilled" size="small" @click.stop />
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="edit">编辑</el-dropdown-item>
            <el-dropdown-item command="delete" divided>删除</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
    <p class="project-card__desc">{{ project.productDesc }}</p>
    <div v-if="project.targetAudience" class="project-card__audience">
      <el-icon><User /></el-icon>
      <span>{{ project.targetAudience }}</span>
    </div>
    <div class="project-card__footer">
      <span>{{ formatDateTime(project.createdAt) }}</span>
      <el-button type="primary" text size="small">进入项目 →</el-button>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { MoreFilled, User } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { formatDateTime } from '@/utils/format'
import type { Project } from '@/types/project'

const props = defineProps<{
  project: Project
}>()

const emit = defineEmits<{
  (e: 'edit', project: Project): void
  (e: 'delete', project: Project): void
}>()

const router = useRouter()

const onView = () => {
  router.push({ name: 'project-detail', params: { id: props.project.id } })
}

const onCommand = (command: 'edit' | 'delete') => {
  if (command === 'edit') emit('edit', props.project)
  else if (command === 'delete') emit('delete', props.project)
}
</script>

<style scoped lang="scss">
.project-card {
  cursor: pointer;
  transition: transform 0.2s ease;
  &:hover {
    transform: translateY(-2px);
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
  }

  &__title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__desc {
    margin: 0;
    color: #646a73;
    font-size: 13px;
    line-height: 1.55;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
    min-height: 60px;
  }

  &__audience {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: #909399;
    margin-top: 12px;
  }

  &__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 18px;
    font-size: 12px;
    color: #909399;
  }
}
</style>
