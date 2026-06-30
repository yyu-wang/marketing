<template>
  <div class="app-header">
    <RouterLink to="/projects" class="app-header__brand">
      <span class="app-header__logo">CW</span>
      <span>CopyWise</span>
    </RouterLink>

    <el-menu
      :default-active="activeMenu"
      mode="horizontal"
      :ellipsis="false"
      router
      class="app-header__menu"
    >
      <el-menu-item index="/projects">我的项目</el-menu-item>
      <el-menu-item index="/dashboard">数据看板</el-menu-item>
    </el-menu>

    <div class="app-header__actions">
      <QuotaBadge />
      <UserMenu />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import QuotaBadge from './QuotaBadge.vue'
import UserMenu from './UserMenu.vue'

const route = useRoute()
const activeMenu = computed(() => (route.path.startsWith('/dashboard') ? '/dashboard' : '/projects'))
</script>

<style scoped lang="scss">
.app-header {
  display: flex;
  align-items: center;
  height: 100%;
  gap: 24px;

  &__brand {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    font-size: 20px;
    font-weight: 700;
    color: #1f2329;
    white-space: nowrap;
  }

  &__logo {
    width: 36px;
    height: 36px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #ffffff;
    background: linear-gradient(135deg, #409eff, #7c4dff);
    border-radius: 10px;
    font-size: 14px;
  }

  &__menu {
    flex: 1;
    border-bottom: none;
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: 16px;
  }
}
</style>
