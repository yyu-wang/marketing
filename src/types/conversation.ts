// 对话与消息类型（与后端 ConversationsService 返回结构对齐）

export type MessageRole = 'user' | 'assistant'
export type MessageStatus = 'pending' | 'streaming' | 'done' | 'error'

export interface Message {
  id: number
  conversationId: number
  role: MessageRole
  content: string | null
  imageUrl: string | null
  xiaohongshu: string | null
  moments: string | null
  status: MessageStatus
  createdAt: string
  updatedAt: string
}

export interface ConversationSummary {
  id: number
  title: string
  updatedAt: string
}

export interface ConversationGroup {
  date: string // '今天' | '昨天' | 'YYYY/MM/DD'
  items: ConversationSummary[]
}

export interface ConversationDetail {
  id: number
  title: string
  createdAt: string
  messages: Message[]
}

export interface PostMessagePayload {
  text?: string
  imageUrl?: string
}

export interface PostMessageResult {
  userMessageId: number
  assistantMessageId: number
}

export interface UploadResult {
  url: string
  filename: string
  size: number
  mime: string
}
