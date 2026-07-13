<template>
  <div class="app-shell">
    <div class="app-stars-bg" aria-hidden="true" />
    <div v-if="isOffline" class="app-offline-banner">
      <el-icon><WarningFilled /></el-icon>
      <span>网络连接已断开，部分功能可能不可用</span>
    </div>
    <div class="app-shell__content">
      <RouterView />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { RouterView } from 'vue-router'
import { WarningFilled } from '@element-plus/icons-vue'

const isOffline = ref(!navigator.onLine)

const onOnline = () => { isOffline.value = false }
const onOffline = () => { isOffline.value = true }

onMounted(() => {
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)
})

onBeforeUnmount(() => {
  window.removeEventListener('online', onOnline)
  window.removeEventListener('offline', onOffline)
})
</script>

<style scoped lang="scss">
.app-offline-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(248, 113, 113, 0.9);
  color: #fff;
  font-size: 13px;
  backdrop-filter: blur(4px);
}

.app-shell {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  height: 100vh;
  width: 100%;
  color: #f1f2f6;

  &__content {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    min-width: 0;
    height: 100%;
    width: 100%;
  }
}
</style>
