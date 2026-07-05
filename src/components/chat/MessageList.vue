<template>
  <div ref="scrollRef" class="message-list">
    <div v-if="!messages.length" class="message-list__empty">
      <div class="message-list__hero">
        <span class="message-list__hero-icon">✨</span>
        <h1 class="message-list__hero-title">今天想创作什么呢？</h1>
        <p class="message-list__hero-sub">
          输入文字或上传图片，AI 同时为你生成「小红书」与「朋友圈」两版文案。
        </p>
      </div>
    </div>

    <div v-else class="message-list__inner">
      <MessageBubble
        v-for="m in messages"
        :key="m.id"
        :message="m"
        :streaming-delta="
          m.id === store.streamingMessageId ? store.streamingDelta : undefined
        "
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import MessageBubble from './MessageBubble.vue'
import { useConversationStore } from '@/stores/conversation'
import type { Message } from '@/types/conversation'

const props = defineProps<{ messages: Message[] }>()
const store = useConversationStore()
const scrollRef = ref<HTMLElement | null>(null)

async function scrollToBottom() {
  await nextTick()
  const el = scrollRef.value
  if (!el) return
  el.scrollTop = el.scrollHeight
}

// 消息条数 / 流式增量 变更时滚到底
watch(
  () => [props.messages.length, store.streamingDelta],
  () => {
    void scrollToBottom()
  },
  { flush: 'post' },
)
</script>

<style scoped lang="scss">
@use '@/styles/variables.scss' as *;

.message-list {
  flex: 1;
  overflow-y: auto;
  padding: 24px 24px 12px;
  display: flex;
  flex-direction: column;

  &__inner {
    width: 100%;
    max-width: 760px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 18px;
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
  }

  &__hero-sub {
    color: $text-secondary;
    font-size: 14px;
    line-height: 1.7;
    margin: 0;
  }
}
</style>
