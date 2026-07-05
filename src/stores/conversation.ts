import { defineStore } from 'pinia'
import { ElMessage } from 'element-plus'
import {
  createConversation,
  deleteConversation,
  getConversation,
  listConversations,
  postMessage,
  renameConversation,
} from '@/api/conversation'
import { chatStream } from '@/api/ai'
import type { StreamHandle } from '@/utils/sse'
import type {
  ConversationDetail,
  ConversationGroup,
  Message,
} from '@/types/conversation'
import { useQuotaStore } from '@/stores/quota'

interface SendPayload {
  text?: string
  imageUrl?: string
}

interface ConversationState {
  list: ConversationGroup[]
  current: ConversationDetail | null
  listLoading: boolean
  detailLoading: boolean
  streaming: boolean
  streamingMessageId: number | null
  streamingDelta: string
  streamHandle: StreamHandle | null
}

/**
 * 对话主 Store。
 *
 * 状态：
 *   - list           侧边栏分组（今天/昨天/...）
 *   - current        当前打开的对话详情（含 messages）
 *   - streaming*     当前流式中的 assistant 消息及增量缓冲
 *
 * 流程（send）：
 *   1) 若无 current，先 POST /conversations 创建
 *   2) POST /conversations/:id/messages 落 user 消息，拿到 assistantMessageId
 *   3) 走 SSE chatStream(assistantMessageId)
 *      - chunk → 累积 delta，刷新 streamingDelta
 *      - result → 把两版文案写回 message
 *      - done → 清理状态 + 同步配额
 *      - error → 标记 message.status = 'error'
 */
export const useConversationStore = defineStore('conversation', {
  state: (): ConversationState => ({
    list: [],
    current: null,
    listLoading: false,
    detailLoading: false,
    streaming: false,
    streamingMessageId: null,
    streamingDelta: '',
    streamHandle: null,
  }),
  getters: {
    currentId: (state) => state.current?.id ?? null,
    messages: (state) => state.current?.messages ?? [],
  },
  actions: {
    async fetchList() {
      this.listLoading = true
      try {
        this.list = await listConversations()
      } finally {
        this.listLoading = false
      }
    },

    async open(id: number) {
      if (this.streaming) this.abortStream()
      this.detailLoading = true
      try {
        this.current = await getConversation(id)
      } finally {
        this.detailLoading = false
      }
    },

    /** 仅清空 current，第一次 send 时才真正创建对话 */
    newConversation() {
      if (this.streaming) this.abortStream()
      this.current = null
      this.streamingDelta = ''
      this.streamingMessageId = null
    },

    async send(payload: SendPayload) {
      if (this.streaming) {
        ElMessage.warning('当前对话正在生成中，请稍候')
        return
      }
      if (!payload.text && !payload.imageUrl) {
        ElMessage.warning('请输入文本或上传图片')
        return
      }

      // 1. 确保有 current
      if (!this.current) {
        const created = await createConversation()
        this.current = {
          id: created.id,
          title: created.title,
          createdAt: created.createdAt,
          messages: [],
        }
      }

      const conversationId = this.current.id

      // 2. 落 user 消息 + assistant 占位
      let result
      try {
        result = await postMessage(conversationId, payload)
      } catch (err) {
        const message = err instanceof Error ? err.message : '消息发送失败'
        ElMessage.error(message)
        return
      }

      const now = new Date().toISOString()
      const userMsg: Message = {
        id: result.userMessageId,
        conversationId,
        role: 'user',
        content: payload.text ?? null,
        imageUrl: payload.imageUrl ?? null,
        xiaohongshu: null,
        moments: null,
        status: 'done',
        createdAt: now,
        updatedAt: now,
      }
      const assistantMsg: Message = {
        id: result.assistantMessageId,
        conversationId,
        role: 'assistant',
        content: null,
        imageUrl: null,
        xiaohongshu: null,
        moments: null,
        status: 'streaming',
        createdAt: now,
        updatedAt: now,
      }
      this.current.messages.push(userMsg, assistantMsg)

      // 3. 启动 SSE
      this.streaming = true
      this.streamingMessageId = assistantMsg.id
      this.streamingDelta = ''

      this.streamHandle = chatStream(assistantMsg.id, {
        onChunk: (e) => {
          this.streamingDelta += e.delta
        },
        onResult: (e) => {
          const target = this.findMessage(e.messageId)
          if (target) {
            target.xiaohongshu = e.xiaohongshu
            target.moments = e.moments
            target.status = 'done'
          }
        },
        onDone: (e) => {
          const quota = useQuotaStore()
          quota.applyServerSnapshot({ remaining: e.remaining, max: e.max })
          this.finalizeStream()
          // 异步刷新侧边栏（新建对话首次出现）
          void this.fetchList()
        },
        onError: (message) => {
          const target = this.findMessage(assistantMsg.id)
          if (target) target.status = 'error'
          ElMessage.error(message)
          this.finalizeStream()
        },
        onClose: () => {
          if (this.streaming) this.finalizeStream()
        },
      })
    },

    abortStream() {
      this.streamHandle?.abort()
      const target = this.streamingMessageId
        ? this.findMessage(this.streamingMessageId)
        : null
      if (target && target.status === 'streaming') target.status = 'error'
      this.finalizeStream()
    },

    finalizeStream() {
      this.streaming = false
      this.streamingMessageId = null
      this.streamingDelta = ''
      this.streamHandle = null
    },

    findMessage(id: number): Message | undefined {
      return this.current?.messages.find((m) => m.id === id)
    },

    async renameCurrent(title: string) {
      if (!this.current) return
      const updated = await renameConversation(this.current.id, title)
      this.current.title = updated.title
      await this.fetchList()
    },

    async remove(id: number) {
      await deleteConversation(id)
      if (this.current?.id === id) this.newConversation()
      await this.fetchList()
    },

    reset() {
      this.abortStream()
      this.list = []
      this.current = null
    },
  },
})
