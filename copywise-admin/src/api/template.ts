import http from './request';
import type { ApiResponse, PaginatedData } from '@/types/api';
import type { PromptTemplate, CreateTemplatePayload, UpdateTemplatePayload } from '@/types/template';

export const getTemplateList = (params: { name?: string; channel?: string; page?: number; pageSize?: number }) =>
  http.get<ApiResponse<PaginatedData<PromptTemplate>>>('/admin/templates', { params });

export const createTemplate = (data: CreateTemplatePayload) =>
  http.post<ApiResponse<PromptTemplate>>('/admin/templates', data);

export const updateTemplate = (id: number, data: UpdateTemplatePayload) =>
  http.patch<ApiResponse<PromptTemplate>>(`/admin/templates/${id}`, data);

export const deleteTemplate = (id: number) =>
  http.delete<ApiResponse<{ deleted: boolean }>>(`/admin/templates/${id}`);
