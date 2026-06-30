import { http } from '@/utils/request'
import type { AnalyticsOverview } from '@/types/analytics'

export const getAnalyticsOverview = () => http.get<AnalyticsOverview>('/analytics/overview')
