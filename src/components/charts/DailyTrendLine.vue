<template>
  <div class="chart-wrap">
    <VChart v-if="hasData" class="chart" :option="option" autoresize />
    <el-empty v-else description="暂无生成趋势数据" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart } from 'echarts/charts'
import { GridComponent, TitleComponent, TooltipComponent } from 'echarts/components'
import type { DailyTrendItem } from '@/types/analytics'

use([CanvasRenderer, LineChart, TitleComponent, TooltipComponent, GridComponent])

const props = defineProps<{
  data: DailyTrendItem[]
}>()

const hasData = computed(() => props.data.length > 0)

const option = computed(() => ({
  title: { text: '近 7 日生成趋势', left: 'center', textStyle: { fontSize: 16, fontWeight: 600 } },
  tooltip: { trigger: 'axis' },
  grid: { left: 40, right: 24, top: 50, bottom: 30 },
  xAxis: {
    type: 'category',
    boundaryGap: false,
    data: props.data.map((item) => item.date),
  },
  yAxis: { type: 'value', minInterval: 1 },
  series: [
    {
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      data: props.data.map((item) => item.count),
      itemStyle: { color: '#409eff' },
      areaStyle: { color: 'rgba(64,158,255,0.18)' },
    },
  ],
}))
</script>

<style scoped lang="scss">
.chart-wrap {
  height: 320px;
}
.chart {
  width: 100%;
  height: 100%;
}
</style>
