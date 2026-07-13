<template>
  <div class="dashboard">
    <div class="dashboard__header">
      <div class="dashboard__back" @click="$router.push('/')">
        <el-icon><Back /></el-icon>
        <span>返回</span>
      </div>
      <h2 class="dashboard__title">数据看板</h2>
    </div>

    <div class="dashboard__cards">
      <div class="stat-card">
        <div class="stat-card__value">{{ totalCopies }}</div>
        <div class="stat-card__label">总文案数</div>
      </div>
      <div class="stat-card">
        <div class="stat-card__value">{{ activeChannels }}</div>
        <div class="stat-card__label">渠道数</div>
      </div>
      <div class="stat-card">
        <div class="stat-card__value">{{ weeklyNew }}</div>
        <div class="stat-card__label">本周新增</div>
      </div>
    </div>

    <div class="dashboard__charts">
      <div class="chart-panel">
        <h3 class="chart-panel__title">渠道分布</h3>
        <v-chart v-if="pieData.length > 0" :option="pieOption" autoresize class="chart-panel__chart" />
        <el-empty v-else description="暂无数据" :image-size="80" />
      </div>
      <div class="chart-panel">
        <h3 class="chart-panel__title">7 日生成趋势</h3>
        <v-chart v-if="trendXData.length > 0" :option="lineOption" autoresize class="chart-panel__chart" />
        <el-empty v-else description="暂无数据" :image-size="80" />
      </div>
    </div>

    <div class="chart-panel chart-panel--starred">
      <h3 class="chart-panel__title">精选文案 Top 5</h3>
      <el-table v-if="topStarred.length > 0" :data="topStarred" stripe class="dashboard-table" row-key="copyId">
        <el-table-column type="index" label="#" width="50" />
        <el-table-column prop="summary" label="摘要" min-width="300" />
        <el-table-column prop="channel" label="渠道" width="100">
          <template #default="{ row }">
            <el-tag size="small">{{ CHANNEL_LABELS[row.channel as ChannelKey] || row.channel }}</el-tag>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-else description="暂无数据" :image-size="80" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { PieChart, LineChart } from 'echarts/charts'
import { TooltipComponent, LegendComponent, GridComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { ElEmpty, ElTable, ElTableColumn, ElTag } from 'element-plus'
import { Back } from '@element-plus/icons-vue'
import * as analyticsApi from '@/api/analytics'
import type { AnalyticsOverview } from '@/types/analytics'

use([PieChart, LineChart, TooltipComponent, LegendComponent, GridComponent, CanvasRenderer])

type ChannelKey = 'xiaohongshu' | 'moments' | 'ad_slogan'

const CHANNEL_LABELS: Record<ChannelKey, string> = {
  xiaohongshu: '小红书',
  moments: '朋友圈',
  ad_slogan: '广告语',
}

const overview = ref<AnalyticsOverview | null>(null)
const loading = ref(false)

const totalCopies = computed(() => {
  if (!overview.value) return 0
  return overview.value.channelDistribution.reduce((sum, item) => sum + item.count, 0)
})

const activeChannels = computed(() => {
  if (!overview.value) return 0
  return overview.value.channelDistribution.filter((item) => item.count > 0).length
})

const weeklyNew = computed(() => {
  if (!overview.value) return 0
  return overview.value.dailyTrend.reduce((sum, item) => sum + item.count, 0)
})

const topStarred = computed(() => overview.value?.topStarred ?? [])

const pieData = computed(() => overview.value?.channelDistribution ?? [])

const pieOption = computed(() => ({
  tooltip: { trigger: 'item' as const },
  legend: { bottom: 0, textStyle: { color: 'rgba(241,242,246,0.72)' } },
  series: [
    {
      type: 'pie' as const,
      radius: ['45%', '70%'],
      center: ['50%', '50%'],
      avoidLabelOverlap: true,
      itemStyle: { borderRadius: 4, borderColor: '#0a0a0f', borderWidth: 3 },
      label: { color: 'rgba(241,242,246,0.72)', fontSize: 12 },
      emphasis: { label: { fontSize: 16, fontWeight: 'bold' } },
      data: pieData.value.map((item) => ({
        name: CHANNEL_LABELS[item.channel as ChannelKey] || item.channel,
        value: item.count,
      })),
    },
  ],
}))

const trendXData = computed(() => overview.value?.dailyTrend.map((item) => item.date) ?? [])

const lineOption = computed(() => ({
  tooltip: { trigger: 'axis' as const },
  grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
  xAxis: {
    type: 'category' as const,
    data: trendXData.value,
    axisLabel: { color: 'rgba(241,242,246,0.56)', fontSize: 11 },
  },
  yAxis: {
    type: 'value' as const,
    minInterval: 1,
    axisLabel: { color: 'rgba(241,242,246,0.56)' },
  },
  series: [
    {
      type: 'line' as const,
      data: overview.value?.dailyTrend.map((item) => item.count) ?? [],
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      lineStyle: { color: '#409eff', width: 2 },
      itemStyle: { color: '#409eff' },
      areaStyle: {
        color: {
          type: 'linear' as const,
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(64,158,255,0.25)' },
            { offset: 1, color: 'rgba(64,158,255,0.02)' },
          ],
        },
      },
    },
  ],
}))

const fetchOverview = async () => {
  loading.value = true
  try {
    overview.value = await analyticsApi.getOverview()
  } catch {
    /* error handled by interceptor */
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchOverview()
})
</script>

<style scoped lang="scss">
.dashboard {
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 40px 32px;
  box-sizing: border-box;
  min-width: 0;

  &__header {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 32px;
  }

  &__back {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: rgba(241, 242, 246, 0.56);
    font-size: 13px;
    cursor: pointer;
    user-select: none;
    white-space: nowrap;
    flex-shrink: 0;

    &:hover {
      color: #409eff;
    }
  }

  &__title {
    margin: 0;
    font-size: 24px;
    font-weight: 600;
    color: #f1f2f6;
    flex: 1;
    min-width: 0;
  }

  &__cards {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 24px;
    margin-bottom: 32px;

    @media (max-width: 1024px) {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    @media (max-width: 640px) {
      grid-template-columns: 1fr;
    }
  }

  &__charts {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 24px;
    margin-bottom: 32px;

    @media (max-width: 1024px) {
      grid-template-columns: 1fr;
    }
  }
}

.stat-card {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  padding: 32px 28px;
  backdrop-filter: blur(8px);

  &__value {
    font-size: 42px;
    font-weight: 700;
    color: #409eff;
    margin-bottom: 12px;
  }

  &__label {
    font-size: 15px;
    color: rgba(241, 242, 246, 0.56);
  }
}

.chart-panel {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  padding: 28px;
  min-width: 0;
  overflow: hidden;

  &__title {
    margin: 0 0 24px;
    font-size: 17px;
    font-weight: 600;
    color: #f1f2f6;
  }

  &__chart {
    height: 380px;
    width: 100%;

    @media (max-width: 1024px) {
      height: 320px;
    }
  }

  &--starred {
    margin-bottom: 32px;
  }
}

.dashboard-table {
  background: transparent;

  :deep(.el-table__header th) {
    background: rgba(255, 255, 255, 0.04);
  }
}
</style>
