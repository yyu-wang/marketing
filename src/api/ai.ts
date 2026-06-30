import { generateStream as startGenerateStream } from '@/utils/sse'
import type { GenerateStreamParams } from '@/types/ai'
import type { SseHandlers } from '@/utils/sse'

export const generateStream = (params: GenerateStreamParams, handlers: SseHandlers) =>
  startGenerateStream(params, handlers)
