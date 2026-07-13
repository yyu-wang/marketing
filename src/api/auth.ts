import http from './request';
import type { ApiResponse } from '@/types/api';

interface LoginResult {
  token: string;
  userId: number;
  email: string;
  role: string;
}

export const loginApi = (data: { email: string; password: string }) =>
  http.post<ApiResponse<LoginResult>>('/auth/login', data);
