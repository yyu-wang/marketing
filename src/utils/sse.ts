import { EventStreamContentType, fetchEventSource } from '@microsoft/fetch-event-source'
import router from '@/router'
import { ROUTE_PATH } from '@/router/routes'
import { useAuthStore } from '@/stores/auth'
import type {
  ChunkEvent,
  ErrorEventPayload,
} from '@/types/ai'

// ---------------------------------------------------------------------------
// 公共类型
// ---------------------------------------------------------------------------

export interface ChatSseOptions {
  continueFrom?: string
  channel?: string
  tone?: string
  length?: string
  onReconnect?: () => void
}

export interface ChatSseHandlers {
  onChunk?: (payload: ChunkEvent) => void
  onDone?: () => void
  onError?: (message: string) => void
  onClose?: () => void
}

export interface StreamHandle {
  abort: () => void
}

const MAX_RETRIES = 3
const BASE_DELAY_MS = 1000

// ---------------------------------------------------------------------------
// 内部：SSE 连接核心
// ---------------------------------------------------------------------------

function createEventStream(
  url: string,
  handlers: ChatSseHandlers,
  onReconnect?: () => void,
): StreamHandle {
  const controller = new AbortController()
  const auth = useAuthStore()
  const token = auth.token ?? ''
  let retryCount = 0

  const connect = () => {
    void fetchEventSource(url, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      signal: controller.signal,
      openWhenHidden: true,
      async onopen(response) {
        if (
          response.ok &&
          response.headers.get('content-type')?.includes(EventStreamContentType)
        ) {
          return
        }
        let message = `连接失败 (${response.status})`
        try {
          const body = await response.json()
          if (body?.message) message = body.message
          if (body?.code === 401) {
            auth.clearSession()
            await router.replace({ path: ROUTE_PATH.LOGIN })
          }
        } catch {
          /* JSON 解析失败使用默认 message */
        }
        throw new Error(message)
      },
      onmessage(ev) {
        try {
          const outer = ev.data
            ? (JSON.parse(ev.data) as { type?: string; data?: string })
            : null
          if (!outer || !outer.type) return

          const eventType = outer.type
          const inner = outer.data
            ? (JSON.parse(outer.data) as Record<string, unknown>)
            : {}

          switch (eventType) {
            case 'chunk':
              handlers.onChunk?.(inner as unknown as ChunkEvent)
              break
            case 'done':
              handlers.onDone?.()
              break
            case 'error':
              handlers.onError?.(
                (inner as unknown as ErrorEventPayload).message || '生成失败',
              )
              break
            default:
              console.warn('[SSE] 未识别的事件类型:', eventType, inner)
          }
        } catch (err) {
          console.error('[SSE] 解析数据失败', err, ev)
        }
      },
      onerror(err) {
        if (retryCount < MAX_RETRIES) {
          retryCount++
          const delay = BASE_DELAY_MS * Math.pow(2, retryCount - 1)
          console.warn(
            `[SSE] 连接断开，${delay}ms 后重试 (${retryCount}/${MAX_RETRIES})`,
          )
          setTimeout(() => {
            if (!controller.signal.aborted) {
              onReconnect?.()
              connect()
            }
          }, delay)
        } else {
          handlers.onError?.(
            err instanceof Error ? err.message : '连接失败，请重试',
          )
        }
      },
      onclose() {
        handlers.onClose?.()
      },
    }).catch((err) => {
      if (controller.signal.aborted) return
      if (retryCount >= MAX_RETRIES) {
        console.error('[SSE] 已达最大重试次数:', err)
      }
    })
  }

  connect()

  return { abort: () => controller.abort() }
}

// ---------------------------------------------------------------------------
// AI 对话流式生成
// ---------------------------------------------------------------------------

function buildStreamUrl(
  assistantMessageId: number,
  opts?: ChatSseOptions,
): string {
  const baseURL = import.meta.env.VITE_API_BASE || '/api'
  let url = `${baseURL}/ai/chat/stream?assistantMessageId=${encodeURIComponent(String(assistantMessageId))}`
  if (opts?.continueFrom)
    url += `&continueFrom=${encodeURIComponent(opts.continueFrom)}`
  if (opts?.channel) url += `&channel=${encodeURIComponent(opts.channel)}`
  if (opts?.tone) url += `&tone=${encodeURIComponent(opts.tone)}`
  if (opts?.length) url += `&length=${encodeURIComponent(opts.length)}`
  return url
}

/**
 * 调用 /api/ai/chat/stream 进行对话流式生成。
 */
export function chatStream(
  assistantMessageId: number,
  handlers: ChatSseHandlers,
  opts?: ChatSseOptions,
): StreamHandle {
  return createEventStream(
    buildStreamUrl(assistantMessageId, opts),
    handlers,
    opts?.onReconnect,
  )
}
