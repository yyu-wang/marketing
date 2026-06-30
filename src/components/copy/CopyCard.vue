<template>
  <el-card class="copy-card" shadow="never">
    <div class="copy-card__head">
      <el-checkbox
        :model-value="selected"
        @update:model-value="(v: any) => emit('toggle-select', Boolean(v))"
      />
      <el-tag :color="channelColor" effect="dark" size="small" disable-transitions>
        {{ channelLabel(copy.channel) }}
      </el-tag>
      <el-tag v-if="copy.isEdited" type="info" size="small" effect="plain">已修改</el-tag>
      <span class="copy-card__time">{{ formatDateTime(copy.createdAt) }}</span>
      <div class="copy-card__actions">
        <el-tooltip :content="copy.isStarred ? '取消收藏' : '收藏'">
          <el-button text :icon="copy.isStarred ? StarFilled : Star" @click="emit('star', copy)" />
        </el-tooltip>
        <el-tooltip content="复制">
          <el-button text :icon="DocumentCopy" @click="onCopyText" />
        </el-tooltip>
        <el-tooltip content="编辑">
          <el-button text :icon="Edit" @click="emit('edit', copy)" />
        </el-tooltip>
        <el-tooltip content="删除">
          <el-button text :icon="Delete" @click="emit('delete', copy)" />
        </el-tooltip>
      </div>
    </div>
    <div class="copy-card__content">
      {{ copy.content }}
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Delete, DocumentCopy, Edit, Star, StarFilled } from '@element-plus/icons-vue'
import { channelLabel } from '@/utils/channel'
import { copyText, formatDateTime } from '@/utils/format'
import { CHANNEL_COLOR } from '@/types/copy'
import type { Copy } from '@/types/copy'

const props = defineProps<{
  copy: Copy
  selected: boolean
}>()

const emit = defineEmits<{
  (e: 'star', copy: Copy): void
  (e: 'edit', copy: Copy): void
  (e: 'delete', copy: Copy): void
  (e: 'toggle-select', value: boolean): void
}>()

const channelColor = computed(() => CHANNEL_COLOR[props.copy.channel])

const onCopyText = () => {
  void copyText(props.copy.content)
}
</script>

<style scoped lang="scss">
.copy-card {
  &__head {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    margin-bottom: 12px;
  }

  &__time {
    color: #909399;
    font-size: 12px;
  }

  &__actions {
    margin-left: auto;
    display: flex;
    gap: 4px;
  }

  &__content {
    color: #1f2329;
    font-size: 14px;
    line-height: 1.7;
    white-space: pre-wrap;
    word-break: break-word;
  }
}
</style>
