<template>
  <div class="chat-view" :class="{ 'chat-view--sidebar-open': sidebarOpen }">
    <div class="chat-view__sidebar" :class="{ 'is-open': sidebarOpen }">
      <ChatSidebar @select="sidebarOpen = false" />
    </div>

    <!-- 移动端遮罩 -->
    <div v-if="sidebarOpen" class="chat-view__overlay" @click="sidebarOpen = false" />

    <main class="chat-view__main">
      <header class="chat-view__header">
        <el-button class="chat-view__menu-btn" text :icon="Expand" @click="sidebarOpen = !sidebarOpen" />
        <div class="chat-view__title">
          {{ store.current?.title ?? '新对话' }}
        </div>
      </header>

      <MessageList :messages="store.messages" />

      <div class="chat-view__input-wrap">
        <ChatInput :disabled="store.streaming" @submit="onSubmit" />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Expand } from '@element-plus/icons-vue'
import ChatSidebar from '@/components/chat/ChatSidebar.vue'
import ChatInput from '@/components/chat/ChatInput.vue'
import MessageList from '@/components/chat/MessageList.vue'
import { useConversationStore } from '@/stores/conversation'

const props = defineProps<{ conversationId?: number }>()

const store = useConversationStore()
const router = useRouter()
const sidebarOpen = ref(false)

onMounted(() => {
  void store.fetchList()
  if (props.conversationId) {
    void store.open(props.conversationId)
  } else {
    store.newConversation()
  }
})

// 路由参数切换时重新加载对应详情（由 send 内部创建的跳过，避免重复请求）
watch(
  () => props.conversationId,
  (id) => {
    if (id) {
      if (store.current?.id !== id) void store.open(id)
    } else {
      store.newConversation()
    }
  },
)

async function onSubmit(payload: { text?: string; imageUrls?: string[] }) {
  const hadCurrent = !!store.current
  await store.send(payload)
  // 第一次发送时 send 内部刚创建了对话，跳转到 /c/:id 让 URL 与状态同步
  if (!hadCurrent && store.current) {
    void router.replace(`/c/${store.current.id}`)
  }
}
</script>

<style scoped lang="scss">
@use '@/styles/variables.scss' as *;

.chat-view {
  display: flex;
  flex: 1;
  min-height: 0;
  height: 100%;

  &__sidebar {
    @media (max-width: 767px) {
      position: fixed;
      top: 0;
      left: 0;
      bottom: 0;
      z-index: 100;
      width: 85vw;
      max-width: 300px;
      transform: translateX(-100%);
      transition: transform 0.25s ease;

      &.is-open {
        transform: translateX(0);
      }
    }
  }

  &__overlay {
    display: none;

    @media (max-width: 767px) {
      display: block;
      position: fixed;
      inset: 0;
      z-index: 99;
      background: rgba(0, 0, 0, 0.5);
    }
  }

  &__main {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    position: relative;
  }

  &__menu-btn {
    display: none;

    @media (max-width: 767px) {
      display: inline-flex;
      margin-right: 8px;
    }
  }

  &__header {
    height: 64px;
    padding: 0 28px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid $border-color;
    background: rgba(7, 7, 13, 0.4);
    backdrop-filter: blur(12px);

    @media (max-width: 767px) {
      padding: 0 16px;
    }
  }

  &__title {
    font-size: 15px;
    color: $text-primary;
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
  }

  &__input-wrap {
    padding: 12px 24px 22px;

    @media (max-width: 767px) {
      padding: 8px 12px 16px;
    }
  }
}
</style>
