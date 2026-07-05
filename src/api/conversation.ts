import { http } from '@/utils/request'
import type {
  ConversationDetail,
  ConversationGroup,
  PostMessagePayload,
  PostMessageResult,
} from '@/types/conversation'

export const listConversations = () =>
  http.get<ConversationGroup[]>('/conversations')

export const createConversation = (title?: string) =>
  http.post<{ id: number; title: string; createdAt: string }>(
    '/conversations',
    { title },
  )

export const getConversation = (id: number) =>
  http.get<ConversationDetail>(`/conversations/${id}`)

export const renameConversation = (id: number, title: string) =>
  http.patch<{ id: number; title: string }>(`/conversations/${id}`, { title })

export const deleteConversation = (id: number) =>
  http.delete<{ id: number }>(`/conversations/${id}`)

export const postMessage = (id: number, payload: PostMessagePayload) =>
  http.post<PostMessageResult>(`/conversations/${id}/messages`, payload)
