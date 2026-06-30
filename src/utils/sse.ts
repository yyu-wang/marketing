import { EventStreamContentType, fetchEventSource } from '@microsoft/fetch-event-source'
import { ElMessage } from 'element-plus'
import router from '@/router'
import { useAuthStore } from '@/stores/auth'
import type {
  ChunkEvent,
  CopyEvent,
  DoneEvent,
  ErrorEventPayload,
  GenerateStreamParams,
} from '@/types/ai'

export interface SseHandlers {
  onChunk?: (payload: ChunkEvent) => void
  onCopy?: (payload: CopyEvent) => void
  onDone?: (payload: DoneEvent) => void
  onError?: (message: string) => void
  onClose?: () => void
}

export interface StreamHandle {
  abort: () => void
}

/**
 * 兼容 fetch + ReadableStream 的 SSE 流式生成。
 * 后端 SSE event 类型有：chunk / copy / done / error，
 * data 字段是 JSON.stringify 后的字符串。
 */
export function generateStream(
  params: GenerateStreamParams,
  handlers: SseHandlers,
): StreamHandle {
  const controller = new AbortController()
  const auth = useAuthStore()
  const baseURL = import.meta.env.VITE_API_BASE || '/api'
  const url = `${baseURL}/ai/generate/stream?projectId=${encodeURIComponent(
    String(params.projectId),
  )}&channel=${encodeURIComponent(params.channel)}`

  void fetchEventSource(url, {
    method: 'GET',
    headers: auth.token
      ? {
          Authorization: `Bearer ${auth.token}`,
        }
      : undefined,
    signal: controller.signal,
    openWhenHidden: true,
    async onopen(response) {
      if (response.ok && response.headers.get('content-type')?.includes(EventStreamContentType)) {
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
          case 'copy':
            handlers.onCopy?.(payload as CopyEvent)
            break
          case 'done':
            handlers.onDone?.(payload as DoneEvent)
            break
          case 'error':
            handlers.onError?.((payload as ErrorEventPayload).message || '生成失败')
            break
        }
      } catch (err) {
        console.error('[SSE] 解析数据失败', err, ev)
      }
    },
    onerror(err) {
      handlers.onError?.(err instanceof Error ? err.message : '生成连接异常')
      // 抛出以终止重试
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
