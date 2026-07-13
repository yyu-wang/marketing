import { defineStore } from 'pinia'
import { ElMessage } from 'element-plus'
import {
  createConversation,
  deleteConversation,
  editMessage,
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

interface SendPayload {
  text?: string
  imageUrls?: string[]
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
  channel: string
  tone: string
  length: string
}

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
    channel: 'xiaohongshu',
    tone: '',
    length: '',
  }),
  getters: {
    currentId: (state) => state.current?.id ?? null,
    /** 展示用（ASC），从服务器 DESC 返回后反转 */
    messages: (state) => {
      const msgs = state.current?.messages ?? []
      return [...msgs].reverse()
    },
    hasMore: (state) => {
      if (!state.current) return false
      return state.current.page * state.current.pageSize < state.current.total
    },
  },
  actions: {
    async fetchList(keyword?: string) {
      this.listLoading = true
      try {
        this.list = await listConversations(keyword)
      } finally {
        this.listLoading = false
      }
    },

    async open(id: number, page = 1, pageSize = 50) {
      if (this.streaming) this.abortStream()
      this.detailLoading = true
      try {
        this.current = await getConversation(id, { page, pageSize })
      } finally {
        this.detailLoading = false
      }
    },

    async loadMore() {
      if (!this.current || this.detailLoading) return
      const nextPage = this.current.page + 1
      if ((nextPage - 1) * this.current.pageSize >= this.current.total) return
      this.detailLoading = true
      try {
        const result = await getConversation(this.current.id, {
          page: nextPage,
          pageSize: this.current.pageSize,
        })
        this.current.messages = [...this.current.messages, ...result.messages]
        this.current.page = result.page
        this.current.total = result.total
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
      if (!payload.text && (!payload.imageUrls || payload.imageUrls.length === 0)) {
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
          total: 0,
          page: 1,
          pageSize: 50,
        }
      }

      const conversationId = this.current.id

      // 2. 落 user 消息 + assistant 占位
      let result
      try {
        result = await postMessage(conversationId, payload)
      } catch (err) {
        // 拦截器已显示后端错误消息，此处不再重复提示。仅处理非 API 响应的意外 Error。
        if (err instanceof Error && !(err as { response?: unknown }).response) {
          ElMessage.error(err.message || '消息发送失败')
        }
        return
      }

      const now = new Date().toISOString()
      const userMsg: Message = {
        id: result.userMessageId,
        conversationId,
        role: 'user',
        content: payload.text ?? null,
        imageUrls: payload.imageUrls ?? null,
        status: 'done',
        createdAt: now,
        updatedAt: now,
      }
      const assistantMsg: Message = {
        id: result.assistantMessageId,
        conversationId,
        role: 'assistant',
        content: null,
        imageUrls: null,
        status: 'streaming',
        createdAt: now,
        updatedAt: now,
      }
      this.current.messages.unshift(assistantMsg, userMsg)

      // 3. 启动 SSE
      this.startStream(assistantMsg.id)
    },

    startStream(assistantMsgId: number, continueFrom?: string) {
      this.streaming = true
      this.streamingMessageId = assistantMsgId
      this.streamingDelta = continueFrom || ''

      this.streamHandle = chatStream(
        assistantMsgId,
        {
          onChunk: (e) => {
            this.streamingDelta += e.delta
          },
          onDone: () => {
            const target = this.findMessage(assistantMsgId)
            if (target) {
              target.content = this.streamingDelta
              target.status = 'done'
            }
            this.finalizeStream()
            void this.fetchList()
          },
          onError: (message) => {
            const target = this.findMessage(assistantMsgId)
            if (target) {
              target.status = 'error'
              target.errorMessage = message
            }
            ElMessage.error(message)
            this.finalizeStream()
          },
          onClose: () => {
            if (this.streaming) this.finalizeStream()
          },
        },
        {
          continueFrom,
          channel: this.channel || undefined,
          tone: this.tone || undefined,
          length: this.length || undefined,
        },
      )
    },

    retryMessage(assistantMsgId: number) {
      if (this.streaming) {
        ElMessage.warning('当前对话正在生成中，请稍候')
        return
      }
      const msg = this.findMessage(assistantMsgId)
      if (!msg || msg.role !== 'assistant' || msg.status !== 'error') return

      msg.status = 'streaming'
      delete msg.errorMessage
      this.startStream(assistantMsgId, msg.content || undefined)
    },

    abortStream() {
      this.streamHandle?.abort()
      const target = this.streamingMessageId
        ? this.findMessage(this.streamingMessageId)
        : null
      if (target && target.status === 'streaming') {
        target.content = this.streamingDelta || null
        target.status = 'error'
        target.errorMessage = '已中止生成'
      }
      this.finalizeStream()
    },

    finalizeStream() {
      const target = this.streamingMessageId
        ? this.findMessage(this.streamingMessageId)
        : null
      if (target && target.status === 'streaming') target.status = 'error'
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

    async editAndResend(messageId: number, content: string) {
      if (!this.current) return
      const conversationId = this.current.id

      const result = await editMessage(conversationId, messageId, content)

      // 从本地消息列表中移除该消息之后的所有消息
      const idx = this.current.messages.findIndex((m) => m.id === messageId)
      if (idx >= 0) {
        // 更新被编辑的消息内容
        this.current.messages[idx].content = content
        // 消息列表按 DESC 存储（最新在开头），idx 位置是被编辑消息
        // 需要删除 idx 之前的所有消息（更新的消息），保留 idx 及之后的（更早的历史）
        this.current.messages = this.current.messages.filter(
          (_, i) => i >= idx,
        )
      }

      // 直接使用后端返回的 assistant 占位消息启动流式生成
      const now = new Date().toISOString()
      const assistantMsg: Message = {
        id: result.assistantMessageId,
        conversationId,
        role: 'assistant',
        content: null,
        imageUrls: null,
        status: 'streaming',
        createdAt: now,
        updatedAt: now,
      }
      this.current.messages.unshift(assistantMsg)
      this.startStream(assistantMsg.id)
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
