import { http } from '@/utils/request'
import type { UploadResult } from '@/types/conversation'

/**
 * 上传图片
 *
 * 通过 multipart/form-data 提交到 POST /api/upload。
 * 后端落本地磁盘，返回相对 URL（如 /uploads/xxx.png）。
 */
export const uploadImage = (file: File): Promise<UploadResult> => {
  const form = new FormData()
  form.append('file', file)
  return http.post<UploadResult>('/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  })
}
