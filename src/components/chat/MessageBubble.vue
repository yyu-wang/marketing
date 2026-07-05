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
      <!-- 用户消息：图片 + 文本 -->
      <template v-if="message.role === 'user'">
        <div v-if="message.imageUrl" class="message-bubble__image">
          <img :src="message.imageUrl" alt="用户上传图片" />
        </div>
        <div v-if="message.content" class="message-bubble__text">
          {{ message.content }}
        </div>
      </template>

      <!-- 助手消息 -->
      <template v-else>
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

        <!-- 已完成 + 结构化两版文案 -->
        <DualCopyCard
          v-else-if="message.status === 'done'"
          :xiaohongshu="message.xiaohongshu ?? ''"
          :moments="message.moments ?? ''"
        />

        <!-- pending（理论上很短暂） -->
        <div v-else-if="message.status === 'pending'" class="message-bubble__text">
          <el-icon class="is-loading"><Loading /></el-icon>
          <span>排队中...</span>
        </div>

        <!-- 错误 -->
        <div v-else class="message-bubble__error">
          <el-icon><WarningFilled /></el-icon>
          生成失败
          <el-button v-if="onRetry" size="small" link @click="onRetry">
            重试
          </el-button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Loading, User, WarningFilled } from '@element-plus/icons-vue'
import DualCopyCard from './DualCopyCard.vue'
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

  &__image {
    img {
      max-width: 240px;
      max-height: 240px;
      border-radius: 12px;
      border: 1px solid $border-color;
      object-fit: cover;
    }
  }

  &__text {
    padding: 10px 14px;
    border-radius: 14px;
    background: $bg-card;
    border: 1px solid $border-color;
    color: $text-primary;
    font-size: 14px;
    line-height: 1.7;
    white-space: pre-wrap;
    word-break: break-word;
  }

  &--user &__text {
    background: linear-gradient(135deg, rgba(124, 92, 255, 0.35), rgba(106, 139, 255, 0.25));
    border-color: rgba(124, 92, 255, 0.4);
  }

  &__streaming {
    background: rgba(255, 255, 255, 0.04);
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
    align-items: center;
    gap: 6px;
    padding: 10px 14px;
    border-radius: 14px;
    background: rgba(248, 113, 113, 0.12);
    border: 1px solid rgba(248, 113, 113, 0.3);
    color: $color-danger;
    font-size: 13px;
  }
}

@keyframes caret-blink {
  0%, 100% { opacity: 0; }
  50% { opacity: 1; }
}
</style>
