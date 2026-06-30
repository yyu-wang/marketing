import { http } from '@/utils/request'
import type { Copy, ListCopiesQuery } from '@/types/copy'

export const listCopies = (projectId: number, query?: ListCopiesQuery) =>
  http.get<Copy[]>(`/projects/${projectId}/copies`, { params: query })

export const updateCopy = (id: number, content: string) =>
  http.put<Copy>(`/copies/${id}`, { content })

export const toggleStar = (id: number, isStarred?: boolean) =>
  http.patch<Copy>(`/copies/${id}/star`, isStarred === undefined ? {} : { isStarred })

export const deleteCopy = (id: number) =>
  http.delete<{ deleted: true }>(`/copies/${id}`)

export const batchDeleteCopies = (ids: number[]) =>
  http.delete<{ deleted: number }>('/copies', { data: { ids } })
