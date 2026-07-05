<template>
  <div class="app-shell">
    <div class="app-stars-bg" aria-hidden="true" />
    <div class="app-shell__content">
      <RouterView />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import { useQuotaStore } from '@/stores/quota'

const quotaStore = useQuotaStore()

onMounted(() => {
  void quotaStore.refresh().catch(() => {
    /* 拦截器已弹提示 */
  })
})
</script>

<style scoped lang="scss">
.app-shell {
  position: relative;
  min-height: 100vh;
  width: 100%;
  color: #f1f2f6;

  &__content {
    position: relative;
    z-index: 1;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }
}
</style>
