<template>
  <el-button class="copy-button" size="small" @click="handleCopy">
    <el-icon><CopyDocument /></el-icon>
    <span class="copy-button__text">复制</span>
  </el-button>
</template>

<script setup lang="ts">
import { CopyDocument } from '@element-plus/icons-vue'
import { copyText } from '@/utils/format'

const props = defineProps<{ text: string }>()

const handleCopy = async () => {
  await copyText(props.text)
}
</script>

<style scoped lang="scss">
@use '@/styles/variables.scss' as *;

.copy-button {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 28px;
  padding: 0 8px;
  border-radius: 8px;
  background: transparent;
  border: none;
  color: $text-secondary;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;

  &__text {
    max-width: 0;
    opacity: 0;
    overflow: hidden;
    white-space: nowrap;
    transition: all 0.2s ease;
  }

  &:hover {
    background: rgba(124, 92, 255, 0.12);
    color: $primary-color;

    .copy-button__text {
      max-width: 40px;
      opacity: 1;
    }
  }
}
</style>
