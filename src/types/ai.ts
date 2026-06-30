import type { CopyChannel } from './copy'

export type SseEventType = 'chunk' | 'copy' | 'done' | 'error'

export interface ChunkEvent {
  delta: string
}

export interface CopyEvent {
  copyId: number
  content: string
  channel: CopyChannel
}

export interface DoneEvent {
  remaining: number
  max: number
}

export interface ErrorEventPayload {
  message: string
}

export interface GenerateStreamParams {
  projectId: number
  channel: CopyChannel
}
