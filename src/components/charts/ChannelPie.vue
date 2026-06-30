<template>
  <div class="chart-wrap">
    <VChart v-if="hasData" class="chart" :option="option" autoresize />
    <el-empty v-else description="暂无渠道数据" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { PieChart } from 'echarts/charts'
import { LegendComponent, TitleComponent, TooltipComponent } from 'echarts/components'
import { channelLabel } from '@/utils/channel'
import { CHANNEL_COLOR } from '@/types/copy'
import type { ChannelDistribution } from '@/types/analytics'

use([CanvasRenderer, PieChart, TitleComponent, TooltipComponent, LegendComponent])

const props = defineProps<{
  data: ChannelDistribution[]
}>()

const hasData = computed(() => props.data.length > 0)

const option = computed(() => ({
  title: { text: '渠道占比', left: 'center', textStyle: { fontSize: 16, fontWeight: 600 } },
  tooltip: { trigger: 'item', formatter: '{b}: {c} 条 ({d}%)' },
  legend: { bottom: 0 },
  series: [
    {
      name: '渠道占比',
      type: 'pie',
      radius: ['38%', '62%'],
      avoidLabelOverlap: true,
      label: { show: true, formatter: '{b}\n{d}%' },
      data: props.data.map((item) => ({
        value: item.count,
        name: channelLabel(item.channel),
        itemStyle: { color: CHANNEL_COLOR[item.channel] },
      })),
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
