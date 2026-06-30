<template>
  <div class="copy-toolbar">
    <div class="copy-toolbar__left">
      <el-select
        :model-value="channel"
        clearable
        placeholder="全部渠道"
        style="width: 160px"
        @update:model-value="(v: any) => emit('update:channel', v || '')"
      >
        <el-option v-for="item in channelOptions" :key="item.value" :label="item.label" :value="item.value" />
      </el-select>
      <el-select
        :model-value="order"
        style="width: 140px"
        @update:model-value="(v: any) => emit('update:order', v)"
      >
        <el-option label="最新优先" value="desc" />
        <el-option label="最早优先" value="asc" />
      </el-select>
      <el-button :icon="Refresh" @click="emit('refresh')">刷新</el-button>
    </div>
    <div class="copy-toolbar__right">
      <span class="copy-toolbar__selected">已选 {{ selectedCount }} 条</span>
      <el-button type="danger" plain :disabled="selectedCount === 0" @click="emit('batch-delete')">
        批量删除
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Refresh } from '@element-plus/icons-vue'
import { CHANNEL_OPTIONS } from '@/utils/channel'
import type { CopyChannel } from '@/types/copy'

defineProps<{
  channel: CopyChannel | ''
  order: 'asc' | 'desc'
  selectedCount: number
}>()

const emit = defineEmits<{
  (e: 'update:channel', value: CopyChannel | ''): void
  (e: 'update:order', value: 'asc' | 'desc'): void
  (e: 'refresh'): void
  (e: 'batch-delete'): void
}>()

const channelOptions = CHANNEL_OPTIONS
</script>

<style scoped lang="scss">
.copy-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;

  &__left,
  &__right {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  &__selected {
    font-size: 13px;
    color: #646a73;
  }
}
</style>
