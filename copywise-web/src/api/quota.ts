import { http } from '@/utils/request'

export interface QuotaStatus {
  todayUsed: number
  dailyLimit: number
  remaining: number
}

export const getQuotaStatus = () => http.get<QuotaStatus>('/quota/status')
