<template>
  <div ref="scrollRef" class="message-list">
    <div v-if="!messages.length" class="message-list__empty">
      <div class="message-list__hero">
        <span class="message-list__hero-icon">✨</span>
        <h1 class="message-list__hero-title">今天想创作什么呢？</h1>
        <p class="message-list__hero-sub">
          输入文字或上传图片，AI 营销文案助手为你提供专业建议。
        </p>
      </div>
    </div>

    <div v-else class="message-list__inner">
      <div v-if="store.hasMore" class="message-list__load-more">
        <el-button :loading="store.detailLoading" text size="small" @click="store.loadMore()">
          加载更早的消息
        </el-button>
      </div>
      <MessageBubble
        v-for="m in messages"
        :key="m.id"
        :message="m"
        :streaming-delta="
          m.id === store.streamingMessageId ? store.streamingDelta : undefined
        "
        :on-retry="m.role === 'assistant' && m.status === 'error' ? () => store.retryMessage(m.id) : undefined"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import MessageBubble from './MessageBubble.vue'
import { useConversationStore } from '@/stores/conversation'
import type { Message } from '@/types/conversation'

const props = defineProps<{ messages: Message[] }>()
const store = useConversationStore()
const scrollRef = ref<HTMLElement | null>(null)

let rafId = 0
let prevScrollHeight = 0

async function scrollToBottom() {
  await nextTick()
  const el = scrollRef.value
  if (!el) return
  el.scrollTop = el.scrollHeight
}

function onScroll() {
  const el = scrollRef.value
  if (!el || !store.hasMore || store.detailLoading) return
  if (el.scrollTop <= 80) {
    prevScrollHeight = el.scrollHeight
    void store.loadMore()
  }
}

// Load more 后保持滚动位置
watch(
  () => store.detailLoading,
  (loading, wasLoading) => {
    if (wasLoading && !loading && prevScrollHeight > 0) {
      void nextTick(() => {
        const el = scrollRef.value
        if (el) el.scrollTop = el.scrollHeight - prevScrollHeight
        prevScrollHeight = 0
      })
    }
  },
)

// 流式生成时 RAF 节流滚动到底部
watch(
  () => [props.messages.length, store.streamingDelta],
  () => {
    cancelAnimationFrame(rafId)
    rafId = requestAnimationFrame(() => scrollToBottom())
  },
  { flush: 'post' },
)

onBeforeUnmount(() => {
  cancelAnimationFrame(rafId)
})
</script>

<style scoped lang="scss">
@use '@/styles/variables.scss' as *;

.message-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 24px 24px 12px;
  display: flex;
  flex-direction: column;

  @media (max-width: 767px) {
    padding: 16px 12px 12px;
  }

  &__inner {
    width: 100%;
    max-width: 1000px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 18px;

    @media (max-width: 767px) {
      gap: 14px;
    }
  }

  &__empty {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__hero {
    text-align: center;
    padding: 32px 16px;
    max-width: 520px;
  }

  &__hero-icon {
    font-size: 42px;
    display: inline-block;
    margin-bottom: 12px;
  }

  &__hero-title {
    font-size: 30px;
    font-weight: 600;
    color: $text-primary;
    margin: 0 0 12px;
    background: $primary-gradient;
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;

    @media (max-width: 767px) {
      font-size: 22px;
    }
  }

  &__hero-sub {
    color: $text-secondary;
    font-size: 14px;
    line-height: 1.7;
    margin: 0;
  }

  &__load-more {
    text-align: center;
    padding: 4px 0 12px;
  }
}
</style>
