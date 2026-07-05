// AI SSE 事件载荷类型（V2 chat 模式）

export type SseEventType = 'chunk' | 'result' | 'done' | 'error'

export interface ChunkEvent {
  delta: string
}

export interface ResultEvent {
  messageId: number
  xiaohongshu: string
  moments: string
}

export interface DoneEvent {
  remaining: number
  max: number
}

export interface ErrorEventPayload {
  message: string
}
