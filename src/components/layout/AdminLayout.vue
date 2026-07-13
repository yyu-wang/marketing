<template>
  <div class="admin-shell">
    <aside class="admin-sidebar">
      <div class="admin-sidebar__brand" @click="$router.push('/')">
        <span class="admin-sidebar__logo">CW</span>
        <span class="admin-sidebar__title">CopyWise 管理</span>
      </div>
      <el-menu
        :default-active="activeMenu"
        router
        class="admin-sidebar__menu"
        background-color="transparent"
        text-color="rgba(241,242,246,0.72)"
        active-text-color="#ffffff"
      >
        <el-menu-item :index="ROUTE_PATH.ADMIN_USERS">
          <el-icon><User /></el-icon>
          <span>用户管理</span>
        </el-menu-item>
        <el-menu-item :index="ROUTE_PATH.ADMIN_TEMPLATES">
          <el-icon><Document /></el-icon>
          <span>模板管理</span>
        </el-menu-item>
        <el-menu-item :index="ROUTE_PATH.ADMIN_SENSITIVE_WORDS">
          <el-icon><Warning /></el-icon>
          <span>敏感词管理</span>
        </el-menu-item>
      </el-menu>
      <div class="admin-sidebar__footer">
        <el-button text class="admin-sidebar__back" @click="$router.push('/')">
          <el-icon><Back /></el-icon>
          <span>返回前台</span>
        </el-button>
      </div>
    </aside>
    <main class="admin-main">
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterView } from 'vue-router'
import { User, Document, Back, Warning } from '@element-plus/icons-vue'
import { ROUTE_PATH } from '@/router/routes'

const route = useRoute()
const activeMenu = computed(() => route.path)
</script>

<style scoped lang="scss">
.admin-shell {
  display: flex;
  height: 100vh;
  background: #0a0a0f;
}

.admin-sidebar {
  width: 220px;
  display: flex;
  flex-direction: column;
  border-right: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(10, 10, 20, 0.92);
  backdrop-filter: blur(12px);
  flex-shrink: 0;

  &__brand {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 20px 20px 16px;
    cursor: pointer;
    user-select: none;
  }

  &__logo {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    background: linear-gradient(135deg, #409eff, #7c4dff);
    color: #fff;
    font-weight: 700;
    font-size: 13px;
  }

  &__title {
    font-size: 14px;
    font-weight: 600;
    color: #f1f2f6;
  }

  &__menu {
    flex: 1;
    border-right: none !important;

    :deep(.el-menu-item) {
      margin: 2px 8px;
      border-radius: 8px;
      height: 40px;
      line-height: 40px;
      font-size: 13px;

      &:hover {
        background: rgba(255, 255, 255, 0.06);
      }

      &.is-active {
        background: rgba(64, 158, 255, 0.15);
        color: #409eff;
      }
    }
  }

  &__footer {
    padding: 12px 8px;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
  }

  &__back {
    width: 100%;
    justify-content: flex-start;
    color: rgba(241, 242, 246, 0.56);
    font-size: 13px;

    &:hover {
      color: #409eff;
    }
  }
}

.admin-main {
  flex: 1;
  overflow: auto;
  padding: 24px;
  min-width: 0;
}
</style>
