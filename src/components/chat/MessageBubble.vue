<template>
  <div
    class="message-bubble"
    :class="[`message-bubble--${message.role}`]"
  >
    <div class="message-bubble__avatar">
      <template v-if="message.role === 'user'">
        <el-icon><User /></el-icon>
      </template>
      <template v-else>
        <span class="message-bubble__bot">AI</span>
      </template>
    </div>

    <div class="message-bubble__content">
      <template v-if="message.role === 'user'">
        <div class="message-bubble__card message-bubble__card--user">
          <div
            v-if="message.imageUrls && message.imageUrls.length > 0"
            class="message-bubble__image-grid"
          >
            <div
              v-for="(url, idx) in message.imageUrls"
              :key="idx"
              class="message-bubble__image"
            >
              <el-image
                :src="url"
                :preview-src-list="message.imageUrls"
                fit="scale-down"
                preview-teleported
              />
            </div>
          </div>

          <div
            v-if="message.imageUrls && message.imageUrls.length > 0 && message.content"
            class="message-bubble__separator"
          />

          <div v-if="message.content" class="message-bubble__text">
            {{ message.content }}
          </div>
        </div>
      </template>

      <template v-else>
        <div
          class="message-bubble__card message-bubble__card--assistant"
          :class="{ 'message-bubble__card--text-only': message.status === 'done' }"
        >
          <!-- 流式中（streaming）：显示打字机原始增量 -->
          <div
            v-if="message.status === 'streaming'"
            class="message-bubble__text message-bubble__streaming"
          >
            <template v-if="streamingDelta">
              {{ streamingDelta }}<span class="message-bubble__caret" />
            </template>
            <template v-else>
              <el-icon class="is-loading"><Loading /></el-icon>
              <span>正在思考...</span>
            </template>
          </div>

          <!-- 已完成：显示回复文本 -->
          <div v-else-if="message.status === 'done'" class="message-bubble__text message-bubble__text--with-action">
            <div class="message-bubble__text-body">{{ message.content }}</div>
            <div class="message-bubble__action">
              <CopyButton :text="message.content || ''" />
            </div>
          </div>

          <!-- pending（理论上很短暂） -->
          <div v-else-if="message.status === 'pending'" class="message-bubble__text">
            <el-icon class="is-loading"><Loading /></el-icon>
            <span>排队中...</span>
          </div>

          <!-- 错误 -->
          <div v-else class="message-bubble__error">
            <el-icon><WarningFilled /></el-icon>
            <span>{{ message.errorMessage || '生成失败' }}</span>
            <el-button v-if="onRetry" size="small" type="danger" plain @click="onRetry">
              重试
            </el-button>
          </div>
        </div>
      </template>
    </div>

  </div>
</template>

<script setup lang="ts">
import { Loading, User, WarningFilled } from '@element-plus/icons-vue'
import CopyButton from '@/components/common/CopyButton.vue'
import type { Message } from '@/types/conversation'

defineProps<{
  message: Message
  /** 仅当本条 message 是当前流式目标时传入 */
  streamingDelta?: string
  onRetry?: () => void
}>()

</script>

<style scoped lang="scss">
@use '@/styles/variables.scss' as *;

.message-bubble {
  display: flex;
  gap: 12px;
  max-width: 100%;

  &--user {
    flex-direction: row-reverse;
    align-self: flex-end;
    max-width: 80%;

    .message-bubble__content {
      align-items: flex-end;
    }
  }

  &__avatar {
    width: 36px;
    height: 36px;
    border-radius: 12px;
    background: $bg-card;
    border: 1px solid $border-color;
    display: flex;
    align-items: center;
    justify-content: center;
    color: $text-primary;
    flex-shrink: 0;
  }

  &__bot {
    background: $primary-gradient;
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    font-weight: 700;
    font-size: 13px;
  }

  &__content {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
    flex: 1;
  }

  &__card {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 12px;
    border-radius: 18px;
    background: $bg-card;
    border: 1px solid $border-color;
  }

  &__card--user {
    background: rgba(124, 92, 255, 0.08);
    border-color: rgba(124, 92, 255, 0.24);
  }

  &__card--assistant {
    background: $bg-card;
  }

  &__image-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  &__image {
    position: relative;
    overflow: hidden;
    border-radius: 16px;
    cursor: zoom-in;
    display: flex;
    align-items: center;
    justify-content: center;
    max-width: 200px;
    max-height: 200px;
    width: min(100%, 200px);
    aspect-ratio: 1 / 1;
    background: rgba(255, 255, 255, 0.04);

    img {
      display: block;
      width: auto;
      height: auto;
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      object-position: center;
    }
  }

  &__separator {
    width: 100%;
    height: 1px;
    background: rgba(255, 255, 255, 0.08);
    margin: 10px 0;
  }

  .message-preview-dialog {
    text-align: center;

    img {
      max-width: 100%;
      max-height: 80vh;
      border-radius: 14px;
    }
  }

  &__text {
    padding: 0;
    border: none;
    background: transparent;
    color: $text-primary;
    font-size: 14px;
    line-height: 1.7;
    white-space: pre-wrap;
    word-break: break-word;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__text--with-action {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: start;
    gap: 10px;
  }

  &__text-body {
    min-width: 0;
  }

  &__action {
    display: flex;
    align-items: flex-start;
  }

  &--user &__text {
    background: transparent;
    border: none;
  }

  &__streaming {
    background: transparent;
  }

  &__caret {
    display: inline-block;
    width: 6px;
    height: 16px;
    margin-left: 2px;
    vertical-align: text-bottom;
    background: $primary-color;
    border-radius: 1px;
    animation: caret-blink 0.9s steps(2) infinite;
  }

  &__error {
    display: inline-flex;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 6px;
    padding: 10px 14px;
    border-radius: 14px;
    background: rgba(248, 113, 113, 0.12);
    border: none;
    color: $color-danger;
    font-size: 13px;
    word-break: break-word;

    span {
      white-space: pre-wrap;
    }
  }
}

@keyframes caret-blink {
  0%, 100% { opacity: 0; }
  50% { opacity: 1; }
}
</style>
