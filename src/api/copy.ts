import { http } from '@/utils/request'
import type { Copy, UpdateCopyPayload } from '@/types/copy'

export const getCopyList = (projectId: number, params?: { channel?: string; order?: 'asc' | 'desc' }) =>
  http.get<Copy[]>(`/projects/${projectId}/copies`, { params })

export const updateCopy = (id: number, data: UpdateCopyPayload) =>
  http.put<Copy>(`/copies/${id}`, data)

export const toggleStar = (id: number, isStarred?: boolean) =>
  http.patch<Copy>(`/copies/${id}/star`, isStarred !== undefined ? { isStarred } : {})

export const deleteCopy = (id: number) =>
  http.delete<{ deleted: boolean }>(`/copies/${id}`)

export const batchDeleteCopies = (ids: number[]) =>
  http.delete<{ deleted: number }>('/copies', { data: { ids } })

export const saveMessageToProject = (messageId: number, projectId: number, channel?: string) =>
  http.post('/copies/from-message', { messageId, projectId, channel })
