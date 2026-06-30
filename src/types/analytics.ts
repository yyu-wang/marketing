import type { CopyChannel } from './copy'

export interface ChannelDistribution {
  channel: CopyChannel
  count: number
  ratio: number
}

export interface TopStarredItem {
  copyId: number
  summary: string
  channel: CopyChannel
}

export interface DailyTrendItem {
  date: string
  count: number
}

export interface AnalyticsOverview {
  channelDistribution: ChannelDistribution[]
  topStarred: TopStarredItem[]
  dailyTrend: DailyTrendItem[]
}
