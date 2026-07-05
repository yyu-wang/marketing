import { EventStreamContentType, fetchEventSource } from '@microsoft/fetch-event-source'
import { ElMessage } from 'element-plus'
import router from '@/router'
import { useAuthStore } from '@/stores/auth'
import type {
  ChunkEvent,
  DoneEvent,
  ErrorEventPayload,
  ResultEvent,
} from '@/types/ai'

export interface ChatSseHandlers {
  onChunk?: (payload: ChunkEvent) => void
  onResult?: (payload: ResultEvent) => void
  onDone?: (payload: DoneEvent) => void
  onError?: (message: string) => void
  onClose?: () => void
}

export interface StreamHandle {
  abort: () => void
}

/**
 * 调用 /api/ai/chat/stream 进行双版文案流式生成。
 *
 * 前置：先通过 POST /api/conversations/:id/messages 落 user 消息得到 assistantMessageId。
 *
 * SSE 事件：
 *   - chunk  原始增量片段（打字机展示用）
 *   - result 结构化两版文案 { xiaohongshu, moments, messageId }
 *   - done   生成完成 + 剩余额度
 *   - error  异常
 *
 * 鉴权：浏览器 EventSource 无法设 header → 走 query.token 兜底；
 * fetch-event-source 这里同时给 header 与 query，双保险。
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
  )}${token ? `&token=${encodeURIComponent(token)}` : ''}`

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
      if (!ev.event) return
      try {
        const payload = ev.data ? JSON.parse(ev.data) : {}
        switch (ev.event) {
          case 'chunk':
            handlers.onChunk?.(payload as ChunkEvent)
            break
          case 'result':
            handlers.onResult?.(payload as ResultEvent)
            break
          case 'done':
            handlers.onDone?.(payload as DoneEvent)
            break
          case 'error':
            handlers.onError?.(
              (payload as ErrorEventPayload).message || '生成失败',
            )
            break
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
    const message = err instanceof Error ? err.message : '生成异常'
    ElMessage.error(message)
  })

  return {
    abort: () => controller.abort(),
  }
}
