import { http } from '@/utils/request'
import type {
  AdminUserListData,
  AdminUserListParams,
  AdminTemplateListData,
  AdminTemplateListParams,
  CreateUserPayload,
  UpdateUserPayload,
  ResetPasswordPayload,
  CreateTemplatePayload,
  UpdateTemplatePayload,
} from '@/types/admin'

// ---- 用户管理 ----

export const getUserList = (params: AdminUserListParams) =>
  http.get<AdminUserListData>('/admin/users', { params })

export const createUser = (data: CreateUserPayload) =>
  http.post<{ id: number; email: string; role: string }>('/admin/users', data)

export const updateUser = (id: number, data: UpdateUserPayload) =>
  http.patch<{ id: number; email: string; role: string; isActive: number }>(`/admin/users/${id}`, data)

export const resetUserPassword = (id: number, data: ResetPasswordPayload) =>
  http.post<{ reset: boolean }>(`/admin/users/${id}/reset-password`, data)

export const deleteUser = (id: number) =>
  http.delete<{ deleted: boolean }>(`/admin/users/${id}`)

// ---- 模板管理 ----

export const getTemplateList = (params: AdminTemplateListParams) =>
  http.get<AdminTemplateListData>('/admin/templates', { params })

export const createTemplate = (data: CreateTemplatePayload) =>
  http.post('/admin/templates', data)

export const updateTemplate = (id: number, data: UpdateTemplatePayload) =>
  http.patch(`/admin/templates/${id}`, data)

export const deleteTemplate = (id: number) =>
  http.delete<{ deleted: boolean }>(`/admin/templates/${id}`)

// ---- 敏感词管理 ----

export const getSensitiveWordList = (params: Record<string, unknown>) =>
  http.get<import('@/types/admin').SensitiveWordListData>('/admin/sensitive-words', { params })

export const createSensitiveWord = (data: import('@/types/admin').CreateSensitiveWordPayload) =>
  http.post('/admin/sensitive-words', data)

export const updateSensitiveWord = (id: number, data: import('@/types/admin').UpdateSensitiveWordPayload) =>
  http.patch(`/admin/sensitive-words/${id}`, data)

export const deleteSensitiveWord = (id: number) =>
  http.delete<{ deleted: boolean }>(`/admin/sensitive-words/${id}`)
