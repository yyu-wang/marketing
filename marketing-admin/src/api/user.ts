import http from './request';
import type { ApiResponse, PaginatedData } from '@/types/api';
import type { User, CreateUserPayload, UpdateUserPayload } from '@/types/user';

export const getUserList = (params: { email?: string; page?: number; pageSize?: number }) =>
  http.get<ApiResponse<PaginatedData<User>>>('/admin/users', { params });

export const createUser = (data: CreateUserPayload) =>
  http.post<ApiResponse<User>>('/admin/users', data);

export const updateUser = (id: number, data: UpdateUserPayload) =>
  http.patch<ApiResponse<User>>(`/admin/users/${id}`, data);

export const deleteUser = (id: number) =>
  http.delete<ApiResponse<{ deleted: boolean }>>(`/admin/users/${id}`);

export const resetUserPassword = (id: number, newPassword: string) =>
  http.post<ApiResponse<{ reset: boolean }>>(`/admin/users/${id}/reset-password`, { newPassword });
