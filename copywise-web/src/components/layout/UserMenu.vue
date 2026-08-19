<template>
  <el-dropdown trigger="click" @command="onCommand">
    <span class="user-menu">
      <el-avatar :size="32" class="user-menu__avatar">{{ initial }}</el-avatar>
      <span class="user-menu__name">{{ displayName }}</span>
      <el-icon><ArrowDown /></el-icon>
    </span>
    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item command="profile">个人设置</el-dropdown-item>
        <el-dropdown-item command="dashboard">数据看板</el-dropdown-item>
        <el-dropdown-item command="projects">项目管理</el-dropdown-item>
        <el-dropdown-item v-if="auth.isAdmin" command="admin" divided>管理后台</el-dropdown-item>
        <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>

  <Teleport to="body">
    <el-dialog v-model="profileVisible" title="个人设置" width="420px" :close-on-click-modal="false">
      <el-form :model="profileForm" label-position="top" @submit.prevent="handleProfileSave">
        <el-form-item label="昵称">
          <el-input v-model="profileForm.nickname" maxlength="20" placeholder="请输入昵称" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="profileVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleProfileSave">保存</el-button>
      </template>
    </el-dialog>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { ArrowDown } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

const profileVisible = ref(false)
const saving = ref(false)
const profileForm = reactive({ nickname: '' })

const displayName = computed(() => auth.user?.nickname || auth.user?.email || '用户')
const initial = computed(() => (displayName.value[0] ?? 'U').toUpperCase())

const onCommand = async (command: string) => {
  if (command === 'profile') {
    profileForm.nickname = auth.user?.nickname || ''
    profileVisible.value = true
    return
  }
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
  if (command === 'logout') {
    await handleLogout()
    return
  }
}

const handleProfileSave = async () => {
  const trimmed = profileForm.nickname.trim()
  if (!trimmed) {
    ElMessage.warning('昵称不能为空')
    return
  }
  saving.value = true
  try {
    await auth.updateProfile(trimmed)
    ElMessage.success('昵称已更新')
    profileVisible.value = false
  } catch {
    /* 拦截器已统一显示后端错误消息 */
  } finally {
    saving.value = false
  }
}

const handleLogout = async () => {
  await auth.logout()
  await router.replace('/login')
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

  &__name {
    font-size: 13px;
    color: rgba(241, 242, 246, 0.78);
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
