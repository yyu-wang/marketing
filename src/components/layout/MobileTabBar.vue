<template>
  <nav class="mobile-tabbar">
    <div
      v-for="tab in tabs"
      :key="tab.key"
      class="mobile-tabbar__item"
      :class="{ 'is-active': tab.active }"
      @click="tab.onClick"
    >
      <el-icon :size="20"><component :is="tab.icon" /></el-icon>
      <span class="mobile-tabbar__label">{{ tab.label }}</span>
    </div>

    <!-- 个人中心弹出菜单 -->
    <Teleport to="body">
      <div v-if="profileOpen" class="mobile-tabbar__overlay" @click="profileOpen = false" />
      <div v-if="profileOpen" class="mobile-tabbar__sheet">
        <div class="mobile-tabbar__sheet-header">
          <el-avatar :size="36">{{ initial }}</el-avatar>
          <span class="mobile-tabbar__sheet-name">{{ displayName }}</span>
        </div>
        <div class="mobile-tabbar__sheet-item" @click="onProfile">个人设置</div>
        <div v-if="auth.isAdmin" class="mobile-tabbar__sheet-item" @click="onAdmin">管理后台</div>
        <div class="mobile-tabbar__sheet-item mobile-tabbar__sheet-item--danger" @click="onLogout">
          退出登录
        </div>
      </div>
    </Teleport>
  </nav>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  ChatDotRound,
  DataAnalysis,
  Folder,
  User,
} from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { ElMessage } from 'element-plus'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const profileOpen = ref(false)

const displayName = computed(() => auth.user?.nickname || auth.user?.email || '用户')
const initial = computed(() => (displayName.value[0] ?? 'U').toUpperCase())

const isActive = (paths: string[]) => {
  const current = route.path
  return paths.some((p) => {
    if (p === '/') return current === '/'
    return current.startsWith(p)
  })
}

const tabs = computed(() => [
  {
    key: 'chat',
    label: '对话',
    icon: ChatDotRound,
    active: isActive(['/', '/c']),
    onClick: () => router.push('/'),
  },
  {
    key: 'dashboard',
    label: '看板',
    icon: DataAnalysis,
    active: isActive(['/dashboard']),
    onClick: () => router.push('/dashboard'),
  },
  {
    key: 'projects',
    label: '项目',
    icon: Folder,
    active: isActive(['/projects']),
    onClick: () => router.push('/projects'),
  },
  {
    key: 'profile',
    label: '我的',
    icon: User,
    active: profileOpen.value,
    onClick: () => {
      profileOpen.value = !profileOpen.value
    },
  },
])

const closeSheet = () => {
  profileOpen.value = false
}

const onProfile = async () => {
  closeSheet()
  // 使用 UserMenu 中的 dialog 逻辑——这里直接触发 profile 编辑
  // 简单方案：跳转到对话页并触发（通过 event bus 或直接调用 store）
  // 这里用 ElMessageBox.prompt 简单处理
  const { ElMessageBox } = await import('element-plus')
  try {
    const { value } = await ElMessageBox.prompt('请输入新的昵称', '个人设置', {
      inputValue: auth.user?.nickname || '',
      inputValidator: (v) =>
        (v && v.trim().length > 0 && v.trim().length <= 20) ||
        '昵称长度需在 1-20 之间',
    })
    await auth.updateProfile(value.trim())
    ElMessage.success('昵称已更新')
  } catch {
    /* 用户取消 */
  }
}

const onAdmin = () => {
  closeSheet()
  router.push('/admin')
}

const onLogout = async () => {
  closeSheet()
  await auth.logout()
  await router.replace('/login')
}
</script>

<style scoped lang="scss">
@use '@/styles/variables.scss' as *;

.mobile-tabbar {
  display: flex;
  align-items: center;
  justify-content: space-around;
  height: 56px;
  padding-bottom: env(safe-area-inset-bottom, 0);
  background: rgba(10, 10, 20, 0.94);
  backdrop-filter: blur(20px);
  border-top: 1px solid $border-color;
  flex-shrink: 0;

  &__item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    padding: 4px 12px;
    min-width: 48px;
    min-height: 44px;
    cursor: pointer;
    color: $text-muted;
    transition: color 0.2s;
    -webkit-tap-highlight-color: transparent;

    &.is-active {
      color: $primary-color;
    }
  }

  &__label {
    font-size: 10px;
    line-height: 1;
  }
}

.mobile-tabbar__overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(0, 0, 0, 0.45);
}

.mobile-tabbar__sheet {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 201;
  background: rgba(20, 20, 36, 0.98);
  backdrop-filter: blur(20px);
  border-radius: 16px 16px 0 0;
  padding: 20px 16px calc(16px + env(safe-area-inset-bottom, 0));

  &-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding-bottom: 16px;
    border-bottom: 1px solid $border-color;
    margin-bottom: 8px;
  }

  &-name {
    font-size: 15px;
    font-weight: 500;
    color: $text-primary;
  }

  &-item {
    padding: 14px 8px;
    font-size: 14px;
    color: $text-primary;
    cursor: pointer;
    border-radius: 10px;
    min-height: 44px;
    display: flex;
    align-items: center;

    &:active {
      background: $bg-card-hover;
    }

    &--danger {
      color: $color-danger;
    }
  }
}
</style>
