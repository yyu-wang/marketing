import { EventStreamContentType, fetchEventSource } from '@microsoft/fetch-event-source'
import router from '@/router'
import { useAuthStore } from '@/stores/auth'
import type {
  ChunkEvent,
  ErrorEventPayload,
} from '@/types/ai'

export interface ChatSseHandlers {
  onChunk?: (payload: ChunkEvent) => void
  onDone?: () => void
  onError?: (message: string) => void
  onClose?: () => void
}

export interface StreamHandle {
  abort: () => void
}

/**
 * 调用 /api/ai/chat/stream 进行对话流式生成。
 *
 * 前置：先通过 POST /api/conversations/:id/messages 落 user 消息得到 assistantMessageId。
 *
 * SSE 事件：
 *   - chunk 流式增量片段（打字机展示用）
 *   - done  生成完成
 *   - error 异常
 *
 * 鉴权：通过 Authorization header，与项目其他接口保持一致。
 */
export function chatStream(
  assistantMessageId: number,
  handlers: ChatSseHandlers,
): StreamHandle {
  const controller = new AbortController()
  const auth = useAuthStore()
  const baseURL = import.meta.env.VITE_API_BASE || '/api'
  const token = auth.token ?? ''
  const url = `${baseURL}/ai/chat/stream?assistantMessageId=${encodeURIComponent(
    String(assistantMessageId),
  )}`

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
        console.log('[SSE] 连接已建立')
        return
      }
      if (response.status === 401) {
        auth.clearSession()
        await router.replace({ path: '/login' })
        throw new Error('登录已过期')
      }
      let message = `连接失败 (${response.status})`
      try {
        const body = await response.json()
        if (body?.message) message = body.message
      } catch {
        /* ignore */
      }
      throw new Error(message)
    },
    onmessage(ev) {
      try {
        // NestJS @Sse() 将事件包装为 { type, data } JSON 放在 data 字段，
        // 且内层 data 也是 JSON 字符串（双重编码），不使用 SSE event: 字段。
        const outer = ev.data ? (JSON.parse(ev.data) as { type?: string; data?: string }) : null
        if (!outer || !outer.type) return

        const eventType = outer.type
        const inner = outer.data ? (JSON.parse(outer.data) as Record<string, unknown>) : {}

        if (eventType === 'chunk' || eventType === 'done') {
          console.log('[SSE] 收到事件:', eventType, eventType === 'chunk' ? `delta:${(inner as { delta?: string }).delta?.slice(0, 20)}` : '')
        }

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
      handlers.onError?.(err instanceof Error ? err.message : '生成连接异常')
      throw err
    },
    onclose() {
      handlers.onClose?.()
    },
  }).catch((err) => {
    if (controller.signal.aborted) return
    console.error('[SSE] 连接异常:', err)
  })

  return {
    abort: () => controller.abort(),
  }
}
