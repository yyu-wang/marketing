<template>
  <div class="dual-copy">
    <div class="dual-copy__card">
      <div class="dual-copy__head">
        <span class="dual-copy__tag dual-copy__tag--xhs">小红书</span>
        <el-button
          link
          :icon="DocumentCopy"
          size="small"
          @click="copy(xiaohongshu, '小红书')"
        >
          复制
        </el-button>
      </div>
      <div class="dual-copy__body">{{ xiaohongshu || '(暂无内容)' }}</div>
    </div>

    <div class="dual-copy__card">
      <div class="dual-copy__head">
        <span class="dual-copy__tag dual-copy__tag--moments">朋友圈</span>
        <el-button
          link
          :icon="DocumentCopy"
          size="small"
          @click="copy(moments, '朋友圈')"
        >
          复制
        </el-button>
      </div>
      <div class="dual-copy__body">{{ moments || '(暂无内容)' }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { DocumentCopy } from '@element-plus/icons-vue'

defineProps<{
  xiaohongshu: string
  moments: string
}>()

async function copy(text: string, label: string) {
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success(`已复制${label}文案`)
  } catch {
    ElMessage.error('复制失败，请手动选择文本')
  }
}
</script>

<style scoped lang="scss">
@use '@/styles/variables.scss' as *;

.dual-copy {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }

  &__card {
    background: $bg-card;
    border: 1px solid $border-color;
    border-radius: 14px;
    padding: 14px 16px;
    backdrop-filter: blur(12px);
  }

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
  }

  &__tag {
    display: inline-flex;
    align-items: center;
    padding: 2px 10px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 600;

    &--xhs {
      color: #ff6b81;
      background: rgba(255, 107, 129, 0.14);
    }
    &--moments {
      color: #6acbff;
      background: rgba(106, 203, 255, 0.14);
    }
  }

  &__body {
    color: $text-primary;
    font-size: 14px;
    line-height: 1.7;
    white-space: pre-wrap;
    word-break: break-word;
  }
}
</style>
