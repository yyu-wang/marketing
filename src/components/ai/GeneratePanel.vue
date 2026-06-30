<template>
  <el-card class="generate-panel" shadow="never">
    <div class="generate-panel__head">
      <div>
        <h3>AI 文案生成</h3>
        <p class="text-muted">选择渠道并点击"开始生成"，将以流式形式输出 3 条文案，每次扣减 1 次额度。</p>
      </div>
      <ChannelTabs v-model="channel" />
    </div>

    <div class="generate-panel__actions">
      <el-button
        v-if="!streaming"
        type="primary"
        :icon="MagicStick"
        :disabled="!channel || quota.exhausted"
        :loading="starting"
        @click="onStart"
      >
        {{ quota.exhausted ? '今日额度已用尽' : '开始生成' }}
      </el-button>
      <el-button v-else type="danger" :icon="CircleClose" @click="onAbort">中止生成</el-button>
      <span v-if="streaming" class="generate-panel__hint">生成中，请稍候…</span>
    </div>

    <div v-if="preview || streaming" class="generate-panel__preview">
      <div class="generate-panel__preview-head">
        <span>实时预览</span>
        <el-tag size="small" :type="streaming ? 'warning' : 'success'">
          {{ streaming ? '流式输出中' : '生成完成' }}
        </el-tag>
      </div>
      <div class="generate-panel__preview-body">
        <pre>{{ preview || '...' }}</pre>
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { CircleClose, MagicStick } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { onBeforeRouteLeave } from 'vue-router'
import ChannelTabs from '@/components/copy/ChannelTabs.vue'
import { generateStream } from '@/api/ai'
import { useQuotaStore } from '@/stores/quota'
import { CopyChannel } from '@/types/copy'
import type { Copy } from '@/types/copy'
import type { StreamHandle } from '@/utils/sse'

const props = defineProps<{
  projectId: number
}>()

const emit = defineEmits<{
  (e: 'copy', copy: Copy): void
}>()

const quota = useQuotaStore()

const channel = ref<CopyChannel | ''>(CopyChannel.XIAOHONGSHU)
const streaming = ref(false)
const starting = ref(false)
const preview = ref('')
let handle: StreamHandle | null = null

const onStart = () => {
  if (!channel.value) {
    ElMessage.warning('请先选择渠道')
    return
  }
  if (quota.exhausted) {
    ElMessage.warning('今日生成额度已用尽，明日 00:00 重置')
    return
  }

  starting.value = true
  preview.value = ''
  streaming.value = true

  handle = generateStream(
    { projectId: props.projectId, channel: channel.value as CopyChannel },
    {
      onChunk: ({ delta }) => {
        starting.value = false
        if (delta) preview.value += delta
      },
      onCopy: (payload) => {
        const copy: Copy = {
          id: payload.copyId,
          projectId: props.projectId,
          channel: payload.channel,
          content: payload.content,
          isStarred: false,
          isEdited: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        emit('copy', copy)
      },
      onDone: ({ remaining, max }) => {
        quota.applyServerSnapshot({ remaining, max })
        ElMessage.success('生成完成')
      },
      onError: (message) => {
        ElMessage.error(message || '生成失败')
      },
      onClose: () => {
        streaming.value = false
        starting.value = false
        handle = null
      },
    },
  )
}

const onAbort = () => {
  if (!handle) return
  handle.abort()
  handle = null
  streaming.value = false
  starting.value = false
  ElMessage.info('已中止生成')
}

const cleanup = () => {
  if (handle) {
    handle.abort()
    handle = null
  }
  streaming.value = false
  starting.value = false
}

onBeforeUnmount(cleanup)
onBeforeRouteLeave(() => {
  cleanup()
})
</script>

<style scoped lang="scss">
.generate-panel {
  &__head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    margin-bottom: 16px;

    h3 {
      margin: 0 0 6px;
    }
    p {
      margin: 0;
      font-size: 13px;
    }
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  &__hint {
    color: #909399;
    font-size: 13px;
  }

  &__preview {
    margin-top: 18px;
    border: 1px dashed #dcdfe6;
    border-radius: 8px;
    padding: 12px 14px;
    background-color: #fafbfc;

    &-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
      color: #909399;
      margin-bottom: 8px;
    }

    &-body {
      max-height: 200px;
      overflow: auto;
    }

    pre {
      margin: 0;
      white-space: pre-wrap;
      word-break: break-word;
      font-family: inherit;
      font-size: 14px;
      line-height: 1.7;
      color: #1f2329;
    }
  }
}
</style>
