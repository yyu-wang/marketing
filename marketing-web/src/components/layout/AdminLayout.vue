<template>
  <div class="admin-shell">
    <!-- 移动端：顶部导航栏 -->
    <header v-if="isMobile" class="admin-mobile-header">
      <el-button text :icon="Expand" @click="sidebarOpen = true" />
      <span class="admin-mobile-header__title">Marketing Wise 管理</span>
      <el-button text :icon="Back" @click="$router.push('/')" />
    </header>

    <!-- 侧边栏：PC 常驻 → 移动端 overlay drawer -->
    <Teleport v-if="isMobile && sidebarOpen" to="body">
      <div class="admin-sidebar-overlay" @click="sidebarOpen = false" />
    </Teleport>

    <aside
      class="admin-sidebar"
      :class="{ 'admin-sidebar--open': isMobile && sidebarOpen }"
    >
      <div class="admin-sidebar__brand" @click="$router.push('/')">
        <span class="admin-sidebar__logo">CW</span>
        <span class="admin-sidebar__title">Marketing Wise 管理</span>
      </div>
      <el-menu
        :default-active="activeMenu"
        router
        class="admin-sidebar__menu"
        background-color="transparent"
        text-color="rgba(241,242,246,0.72)"
        active-text-color="#ffffff"
        @select="closeSidebar"
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
import { computed, ref } from 'vue'
import { RouterView } from 'vue-router'
import { User, Document, Back, Expand, Warning } from '@element-plus/icons-vue'
import { ROUTE_PATH } from '@/router/routes'
import { useDevice } from '@/composables/useDevice'

const route = useRoute()
const activeMenu = computed(() => route.path)
const sidebarOpen = ref(false)

const { isMobile } = useDevice()

const closeSidebar = () => {
  sidebarOpen.value = false
}
</script>

<style scoped lang="scss">
.admin-shell {
  display: flex;
  height: 100vh;
  background: #0a0a0f;
}

// 移动端顶部导航
.admin-mobile-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 8px;
  background: rgba(10, 10, 20, 0.94);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);

  &__title {
    font-size: 14px;
    font-weight: 600;
    color: #f1f2f6;
  }
}

.admin-sidebar-overlay {
  position: fixed;
  inset: 0;
  z-index: 90;
  background: rgba(0, 0, 0, 0.45);
}

.admin-sidebar {
  width: 220px;
  display: flex;
  flex-direction: column;
  border-right: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(10, 10, 20, 0.92);
  backdrop-filter: blur(12px);
  flex-shrink: 0;

  @media (max-width: 767px) {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    z-index: 100;
    transform: translateX(-100%);
    transition: transform 0.25s ease;

    &--open {
      transform: translateX(0);
    }
  }

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

  @media (max-width: 767px) {
    padding: 16px;
    margin-top: 48px;
  }
}
</style>
