<template>
  <el-container class="app-layout">
    <el-header class="app-layout__header" height="64px">
      <AppHeader />
    </el-header>
    <el-main class="app-layout__main">
      <RouterView />
    </el-main>
  </el-container>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import AppHeader from './AppHeader.vue'
import { useQuotaStore } from '@/stores/quota'

const quotaStore = useQuotaStore()

onMounted(() => {
  void quotaStore.refresh().catch(() => {
    /* 拦截器已弹提示 */
  })
})
</script>

<style scoped lang="scss">
.app-layout {
  min-height: 100vh;
  background-color: #f5f7fa;

  &__header {
    background-color: #ffffff;
    border-bottom: 1px solid #e4e7ed;
    padding: 0 24px;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  }

  &__main {
    padding: 24px;
  }
}
</style>
