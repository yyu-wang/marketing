<template>
  <aside class="chat-sidebar">
    <div class="chat-sidebar__top">
      <div class="chat-sidebar__brand">
        <span class="chat-sidebar__logo">MW</span>
        <span class="chat-sidebar__name">Marketing Wise</span>
      </div>

      <el-input
        v-model="searchKeyword"
        placeholder="搜索对话..."
        :prefix-icon="Search"
        clearable
        size="small"
        class="chat-sidebar__search"
        @input="onSearchInput"
        @clear="onSearchClear"
      />

      <el-button
        class="chat-sidebar__new"
        type="primary"
        round
        :icon="Plus"
        @click="onNew"
      >
        新建对话
      </el-button>

      <div v-loading="store.listLoading" class="chat-sidebar__list">
        <template v-if="store.list.length">
          <div
            v-for="group in store.list"
            :key="group.date"
            class="chat-sidebar__group"
          >
            <div class="chat-sidebar__group-title">{{ group.date }}</div>
            <div
              v-for="item in group.items"
              :key="item.id"
              class="chat-sidebar__item"
              :class="{ 'is-active': item.id === store.currentId }"
              @click="onOpen(item.id)"
            >
              <span class="chat-sidebar__item-title" :title="item.title">
                {{ item.title }}
              </span>
              <el-dropdown
                trigger="click"
                @command="(cmd: string) => onAction(cmd, item)"
                @click.stop
              >
                <el-icon class="chat-sidebar__item-more"><MoreFilled /></el-icon>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="rename">重命名</el-dropdown-item>
                    <el-dropdown-item command="delete" divided>
                      <span class="text-danger">删除</span>
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </div>
        </template>
        <div v-else-if="!store.listLoading" class="chat-sidebar__empty">
          暂无历史对话
        </div>
      </div>
    </div>

    <div class="chat-sidebar__footer">
      <UserMenu />
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { MoreFilled, Plus, Search } from '@element-plus/icons-vue'
import UserMenu from '@/components/layout/UserMenu.vue'
import { useConversationStore } from '@/stores/conversation'
import type { ConversationSummary } from '@/types/conversation'

const SEARCH_DEBOUNCE_MS = 300

const emit = defineEmits<{ (e: 'select'): void }>()

const store = useConversationStore()
const router = useRouter()

const searchKeyword = ref('')
let debounceTimer: ReturnType<typeof setTimeout> | null = null

const onSearchInput = () => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    store.fetchList(searchKeyword.value || undefined)
  }, SEARCH_DEBOUNCE_MS)
}

const onSearchClear = () => {
  store.fetchList()
}

function onNew() {
  store.newConversation()
  void router.push('/')
  emit('select')
}

function onOpen(id: number) {
  if (store.currentId === id) return
  void router.push(`/c/${id}`)
  emit('select')
}

async function onAction(cmd: string, item: ConversationSummary) {
  if (cmd === 'rename') {
    try {
      const { value } = await ElMessageBox.prompt('请输入新的标题', '重命名对话', {
        inputValue: item.title,
        inputValidator: (v) =>
          (v && v.trim().length > 0 && v.trim().length <= 60) ||
          '标题长度需在 1-60 之间',
      })
      const newTitle = value.trim()
      // 先切到目标对话以便 store.renameCurrent 可用
      if (store.currentId !== item.id) await store.open(item.id)
      await store.renameCurrent(newTitle)
      ElMessage.success('已重命名')
    } catch {
      /* 用户取消 */
    }
  } else if (cmd === 'delete') {
    try {
      await ElMessageBox.confirm('确定删除这条对话吗？此操作不可恢复。', '删除对话', {
        type: 'warning',
      })
      await store.remove(item.id)
      ElMessage.success('已删除')
      if (store.currentId === null) void router.push('/')
    } catch {
      /* 用户取消 */
    }
  }
}
</script>

<style scoped lang="scss">
@use '@/styles/variables.scss' as *;

.chat-sidebar {
  width: 260px;
  min-height: 100vh;
  height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 18px 14px;
  background: rgba(10, 10, 20, 0.92);
  backdrop-filter: blur(18px);
  border-right: 1px solid $border-color;

  &__brand {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 4px 6px 16px;
  }

  &__logo {
    width: 32px;
    height: 32px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: $primary-gradient;
    color: #fff;
    border-radius: 10px;
    font-weight: 700;
    font-size: 13px;
  }

  &__name {
    font-weight: 600;
    font-size: 16px;
    color: $text-primary;
  }

  &__search {
    margin-bottom: 10px;
  }

  &__new {
    margin: 4px 0 18px;
    width: 100%;
  }

  &__top {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  &__list {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding-right: 4px;
  }

  &__group + &__group {
    margin-top: 12px;
  }

  &__group-title {
    font-size: 12px;
    color: $text-muted;
    padding: 0 8px 6px;
    letter-spacing: 0.5px;
  }

  &__item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    padding: 10px 12px;
    border-radius: 10px;
    cursor: pointer;
    color: $text-secondary;
    font-size: 13px;
    transition: background 0.15s ease;
    content-visibility: auto;
    contain-intrinsic-size: 0 44px;
    min-height: 44px;

    &:hover {
      background: $bg-card-hover;
      color: $text-primary;
    }

    &.is-active {
      background: rgba(124, 92, 255, 0.18);
      color: $text-primary;
    }
  }

  &__item-title {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__item-more {
    color: $text-muted;
    cursor: pointer;
    padding: 2px;

    &:hover {
      color: $text-primary;
    }
  }

  &__empty {
    color: $text-muted;
    font-size: 13px;
    text-align: center;
    padding: 24px 0;
  }

  &__footer {
    padding: 12px 8px 4px;
    border-top: 1px solid $border-color;
    flex-shrink: 0;
    background: rgba(10, 10, 20, 0.92);
  }

}
</style>
