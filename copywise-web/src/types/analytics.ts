export interface ChannelDistribution {
  channel: string
  count: number
  ratio: number
}

export interface TopStarredCopy {
  copyId: number
  summary: string
  channel: string
}

export interface DailyTrend {
  date: string
  count: number
}

export interface AnalyticsOverview {
  channelDistribution: ChannelDistribution[]
  topStarred: TopStarredCopy[]
  dailyTrend: DailyTrend[]
}
