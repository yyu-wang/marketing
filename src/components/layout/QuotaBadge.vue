<template>
  <el-tooltip :content="tooltipText" placement="bottom" :disabled="!tooltipText">
    <div class="quota-badge" :class="statusClass">
      <el-icon><Lightning /></el-icon>
      <span>今日剩余 {{ quota.remaining }}/{{ quota.max }}</span>
    </div>
  </el-tooltip>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Lightning } from '@element-plus/icons-vue'
import { useQuotaStore } from '@/stores/quota'

const quota = useQuotaStore()

const statusClass = computed(() => ({
  'is-warning': quota.lowBalance,
  'is-danger': quota.exhausted,
}))

const tooltipText = computed(() => {
  if (quota.exhausted) return '今日额度已用尽，明日 00:00 重置'
  if (quota.lowBalance) return '今日额度即将用尽'
  return ''
})
</script>

<style scoped lang="scss">
.quota-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 13px;
  color: #409eff;
  background-color: rgba(64, 158, 255, 0.1);
  font-weight: 500;

  &.is-warning {
    color: #e6a23c;
    background-color: rgba(230, 162, 60, 0.12);
  }

  &.is-danger {
    color: #f56c6c;
    background-color: rgba(245, 108, 108, 0.12);
  }
}
</style>
