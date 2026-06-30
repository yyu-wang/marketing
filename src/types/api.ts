/**
 * 后端统一响应格式 PRD 9.2 / 9.3
 *   成功：{ code: 200, message: 'success', data }
 *   失败：{ code, message, details? }
 */
export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
  details?: string[]
}

export interface ApiErrorPayload {
  code: number
  message: string
  details?: string[]
}
