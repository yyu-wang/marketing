<template>
  <el-radio-group :model-value="modelValue" @update:model-value="onChange">
    <el-radio-button v-for="option in options" :key="option.value" :value="option.value">
      {{ option.label }}
    </el-radio-button>
  </el-radio-group>
</template>

<script setup lang="ts">
import { CHANNEL_OPTIONS } from '@/utils/channel'
import type { CopyChannel } from '@/types/copy'

defineProps<{
  modelValue: CopyChannel | ''
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: CopyChannel): void
}>()

const options = CHANNEL_OPTIONS

const onChange = (value: string | number | boolean | undefined) => {
  if (typeof value === 'string') emit('update:modelValue', value as CopyChannel)
}
</script>
