import { http } from '@/utils/request'
import type { AnalyticsOverview } from '@/types/analytics'

export const getOverview = () => http.get<AnalyticsOverview>('/analytics/overview')
