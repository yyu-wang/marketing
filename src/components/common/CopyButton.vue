<template>
  <el-tooltip content="复制内容" effect="dark">
    <el-button class="copy-button" link size="small" @click="handleCopy">
      <el-icon><CopyDocument /></el-icon>
    </el-button>
  </el-tooltip>
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
.copy-button {
  color: rgba(255, 255, 255, 0.72);
  transition: color 0.2s ease;

  &:hover {
    color: #fff;
  }
}
</style>
