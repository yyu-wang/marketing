import { http } from '@/utils/request'
import type { AuthResult, LoginPayload, RegisterPayload } from '@/types/auth'

export const login = (payload: LoginPayload) =>
  http.post<AuthResult>('/auth/login', payload)

export const register = (payload: RegisterPayload) =>
  http.post<AuthResult>('/auth/register', payload)

export const updateProfile = (nickname: string) =>
  http.patch<{ nickname: string }>('/auth/profile', { nickname })
