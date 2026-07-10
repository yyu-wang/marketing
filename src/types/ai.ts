// AI SSE 事件载荷类型（V2 chat 模式）

export type SseEventType = 'chunk' | 'done' | 'error'

export interface ChunkEvent {
  delta: string
}

export interface ErrorEventPayload {
  message: string
}
