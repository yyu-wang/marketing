import http from './request';
import type { ApiResponse, PaginatedData } from '@/types/api';
import type { QuotaOverview, SetQuotaPayload } from '@/types/quota';

export const getQuotaList = (params: { email?: string; page?: number; pageSize?: number }) =>
  http.get<ApiResponse<PaginatedData<QuotaOverview>>>('/admin/quota', { params });

export const setUserQuota = (userId: number, data: SetQuotaPayload) =>
  http.patch<ApiResponse<{ userId: number; dailyQuota: number }>>(`/admin/quota/${userId}`, data);
