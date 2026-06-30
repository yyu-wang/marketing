<template>
  <div class="chart-wrap">
    <VChart v-if="hasData" class="chart" :option="option" autoresize />
    <el-empty v-else description="暂无收藏数据" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart } from 'echarts/charts'
import { GridComponent, TitleComponent, TooltipComponent } from 'echarts/components'
import { channelLabel } from '@/utils/channel'
import { CHANNEL_COLOR } from '@/types/copy'
import { truncate } from '@/utils/format'
import type { TopStarredItem } from '@/types/analytics'

use([CanvasRenderer, BarChart, TitleComponent, TooltipComponent, GridComponent])

const props = defineProps<{
  data: TopStarredItem[]
}>()

const hasData = computed(() => props.data.length > 0)

const option = computed(() => {
  const reversed = [...props.data].reverse()
  return {
    title: { text: '收藏 Top', left: 'center', textStyle: { fontSize: 16, fontWeight: 600 } },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        const p = params[0]
        const item = reversed[p.dataIndex]
        return `${channelLabel(item.channel)}<br/>${truncate(item.summary, 60)}`
      },
    },
    grid: { left: 60, right: 24, top: 40, bottom: 24 },
    xAxis: { type: 'value', max: reversed.length },
    yAxis: {
      type: 'category',
      data: reversed.map((item) => `#${item.copyId}`),
    },
    series: [
      {
        type: 'bar',
        data: reversed.map((item, idx) => ({
          value: idx + 1,
          itemStyle: { color: CHANNEL_COLOR[item.channel] },
        })),
        barWidth: 14,
        label: {
          show: true,
          position: 'right',
          formatter: (params: any) => truncate(reversed[params.dataIndex].summary, 16),
        },
      },
    ],
  }
})
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
