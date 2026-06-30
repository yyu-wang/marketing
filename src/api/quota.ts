import { http } from '@/utils/request'
import type { Quota } from '@/types/quota'

export const getTodayQuota = () => http.get<Quota>('/quota/today')
