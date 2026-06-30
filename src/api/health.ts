import { http } from '@/utils/request'

export const health = () => http.get<{ status: string }>('/health')
