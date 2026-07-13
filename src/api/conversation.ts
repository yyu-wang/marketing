import { http } from '@/utils/request'
import type {
  ConversationDetail,
  ConversationGroup,
  GetConversationParams,
  PostMessagePayload,
  PostMessageResult,
} from '@/types/conversation'

export const listConversations = (keyword?: string) =>
  http.get<ConversationGroup[]>('/conversations', { params: keyword ? { keyword } : {} })

export const createConversation = (title?: string) =>
  http.post<{ id: number; title: string; createdAt: string }>(
    '/conversations',
    { title },
  )

export const getConversation = (id: number, params?: GetConversationParams) =>
  http.get<ConversationDetail>(`/conversations/${id}`, { params })

export const renameConversation = (id: number, title: string) =>
  http.patch<{ id: number; title: string }>(`/conversations/${id}`, { title })

export const deleteConversation = (id: number) =>
  http.delete<{ id: number }>(`/conversations/${id}`)

export const postMessage = (id: number, payload: PostMessagePayload) =>
  http.post<PostMessageResult>(`/conversations/${id}/messages`, payload)

export const editMessage = (conversationId: number, messageId: number, content: string) =>
  http.put<{ conversationId: number; messageId: number; assistantMessageId: number }>(
    `/conversations/${conversationId}/messages/${messageId}`,
    { content },
  )

export const getMessageVersions = (conversationId: number, messageId: number) =>
  http.get<Array<{ id: number; version: number; content: string; createdAt: string }>>(
    `/conversations/${conversationId}/messages/${messageId}/versions`,
  )

export const restoreMessageVersion = (
  conversationId: number,
  messageId: number,
  versionId: number,
) =>
  http.patch<{ content: string }>(
    `/conversations/${conversationId}/messages/${messageId}/versions/${versionId}/restore`,
  )
