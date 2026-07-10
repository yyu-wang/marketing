<template>
  <div class="app-shell">
    <div class="app-stars-bg" aria-hidden="true" />
    <div class="app-shell__content">
      <RouterView />
    </div>
  </div>
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<style scoped lang="scss">
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
    height: 100%;
  }
}
</style>
