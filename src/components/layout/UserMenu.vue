<template>
  <el-dropdown trigger="click" @command="onCommand">
    <span class="user-menu">
      <el-avatar :size="32" class="user-menu__avatar">{{ initial }}</el-avatar>
      <span class="user-menu__email">{{ auth.user?.email }}</span>
      <el-icon><ArrowDown /></el-icon>
    </span>
    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item command="dashboard">数据看板</el-dropdown-item>
        <el-dropdown-item command="projects">项目管理</el-dropdown-item>
        <el-dropdown-item v-if="auth.isAdmin" command="admin" divided>管理后台</el-dropdown-item>
        <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ArrowDown } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

const initial = computed(() => (auth.user?.email?.[0] ?? 'U').toUpperCase())

const onCommand = async (command: string) => {
  if (command === 'dashboard') {
    await router.push('/dashboard')
    return
  }
  if (command === 'projects') {
    await router.push('/projects')
    return
  }
  if (command === 'admin') {
    await router.push('/admin')
    return
  }
  if (command !== 'logout') return
  try {
    await ElMessageBox.confirm('确定要退出登录吗？', '提示', { type: 'warning' })
    await auth.logout()
    await router.replace('/login')
  } catch {
    /* 取消 */
  }
}
</script>

<style scoped lang="scss">
.user-menu {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;

  &__avatar {
    background: linear-gradient(135deg, #409eff, #7c4dff);
    color: #ffffff;
    font-weight: 600;
  }

  &__email {
    font-size: 13px;
    color: rgba(241, 242, 246, 0.78);
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
