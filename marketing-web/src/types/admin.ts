export interface AdminUser {
  id: number
  email: string
  role: string
  isActive: number
  createdAt: string
  updatedAt: string
}

export interface AdminUserListParams {
  page?: number
  pageSize?: number
  email?: string
}

export interface AdminUserListData {
  list: AdminUser[]
  total: number
  page: number
  pageSize: number
}

export interface CreateUserPayload {
  email: string
  password: string
  role?: string
}

export interface UpdateUserPayload {
  role?: string
  isActive?: number
}

export interface ResetPasswordPayload {
  newPassword: string
}

export interface AdminTemplate {
  id: number
  name: string
  channel: string
  content: string
  createdAt: string
  updatedAt: string
}

export interface AdminTemplateListParams {
  page?: number
  pageSize?: number
  name?: string
  channel?: string
}

export interface AdminTemplateListData {
  list: AdminTemplate[]
  total: number
  page: number
  pageSize: number
}

export interface CreateTemplatePayload {
  name: string
  channel: string
  content: string
}

export interface UpdateTemplatePayload {
  name?: string
  channel?: string
  content?: string
}

export interface SensitiveWord {
  id: number
  word: string
  category: string
  isActive: boolean
  createdAt: string
}

export interface SensitiveWordListParams {
  page?: number
  pageSize?: number
  word?: string
  category?: string
}

export interface SensitiveWordListData {
  list: SensitiveWord[]
  total: number
  page: number
  pageSize: number
}

export interface CreateSensitiveWordPayload {
  word: string
  category?: string
}

export interface UpdateSensitiveWordPayload {
  word?: string
  category?: string
  isActive?: boolean
}
