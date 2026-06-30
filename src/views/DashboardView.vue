<template>
  <div class="page-container dashboard-view">
    <div class="dashboard-view__header">
      <div>
        <h1>数据看板</h1>
        <p>查看渠道占比、收藏排行与近 7 日生成趋势。</p>
      </div>
      <el-button :icon="Refresh" :loading="loading" @click="fetchData">刷新</el-button>
    </div>

    <el-skeleton v-if="loading" :rows="8" animated />
    <template v-else>
      <div class="dashboard-view__stats">
        <el-card shadow="never">
          <span>渠道类型</span>
          <strong>{{ overview.channelDistribution.length }}</strong>
        </el-card>
        <el-card shadow="never">
          <span>收藏文案</span>
          <strong>{{ overview.topStarred.length }}</strong>
        </el-card>
        <el-card shadow="never">
          <span>7 日生成</span>
          <strong>{{ totalTrend }}</strong>
        </el-card>
      </div>

      <div class="dashboard-view__grid mt-16">
        <el-card shadow="never">
          <ChannelPie :data="overview.channelDistribution" />
        </el-card>
        <el-card shadow="never">
          <TopStarredBar :data="overview.topStarred" />
        </el-card>
      </div>

      <el-card class="mt-16" shadow="never">
        <DailyTrendLine :data="overview.dailyTrend" />
      </el-card>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import { getAnalyticsOverview } from '@/api/analytics'
import ChannelPie from '@/components/charts/ChannelPie.vue'
import DailyTrendLine from '@/components/charts/DailyTrendLine.vue'
import TopStarredBar from '@/components/charts/TopStarredBar.vue'
import type { AnalyticsOverview } from '@/types/analytics'

const loading = ref(false)
const overview = reactive<AnalyticsOverview>({
  channelDistribution: [],
  topStarred: [],
  dailyTrend: [],
})

const totalTrend = computed(() => overview.dailyTrend.reduce((sum, item) => sum + item.count, 0))

const fetchData = async () => {
  loading.value = true
  try {
    const data = await getAnalyticsOverview()
    overview.channelDistribution = data.channelDistribution ?? []
    overview.topStarred = data.topStarred ?? []
    overview.dailyTrend = data.dailyTrend ?? []
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)
</script>

<style scoped lang="scss">
.dashboard-view {
  &__header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 24px;
    margin-bottom: 24px;

    h1 {
      margin: 0 0 8px;
      font-size: 26px;
    }
    p {
      margin: 0;
      color: #646a73;
    }
  }

  &__stats {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px;

    span {
      display: block;
      color: #646a73;
      font-size: 13px;
      margin-bottom: 8px;
    }
    strong {
      font-size: 28px;
      color: #1f2329;
    }
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
  }
}

@media (max-width: 900px) {
  .dashboard-view__stats,
  .dashboard-view__grid {
    grid-template-columns: 1fr;
  }
}
</style>
