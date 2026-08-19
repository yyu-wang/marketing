<template>
  <div class="chat-input">
    <div class="chat-input__image-row">
      <div
        v-for="(url, idx) in imageUrls"
        :key="url"
        class="chat-input__image-chip"
      >
        <img :src="url" alt="待发送图片" />
        <el-icon class="chat-input__image-remove" @click="removeImage(idx)">
          <Close />
        </el-icon>
      </div>

      <el-tooltip :content="uploadTip" placement="top">
        <div
          class="chat-input__upload-btn"
          :class="{ 'is-disabled': disabled || imageUrls.length >= 9 }"
          @click="triggerPick"
        >
          <el-icon v-if="!uploading"><Plus /></el-icon>
          <el-icon v-else class="is-loading"><Loading /></el-icon>
        </div>
      </el-tooltip>
    </div>

    <!-- 渠道选择 -->
    <div class="chat-input__options">
      <div class="chat-input__options-left">
        <el-radio-group
          v-model="store.channel"
          size="small"
        >
          <el-radio-button value="xiaohongshu">小红书</el-radio-button>
          <el-radio-button value="moments">朋友圈</el-radio-button>
          <el-radio-button value="ad_slogan">广告语</el-radio-button>
        </el-radio-group>
      </div>

      <el-button
        text
        size="small"
        class="chat-input__advanced-toggle"
        @click="showAdvanced = !showAdvanced"
      >
        高级选项
        <el-icon><ArrowDown v-if="!showAdvanced" /><ArrowUp v-else /></el-icon>
      </el-button>
    </div>

    <!-- 高级选项 -->
    <div v-if="showAdvanced" class="chat-input__advanced">
      <div class="chat-input__advanced-item">
        <label class="chat-input__label">语气</label>
        <el-select v-model="store.tone" size="small" clearable placeholder="默认" style="width: 130px">
          <el-option label="专业" value="professional" />
          <el-option label="活泼" value="lively" />
          <el-option label="文艺" value="literary" />
        </el-select>
      </div>
      <div class="chat-input__advanced-item">
        <label class="chat-input__label">长度</label>
        <el-select v-model="store.length" size="small" clearable placeholder="默认" style="width: 130px">
          <el-option label="简短" value="short" />
          <el-option label="适中" value="medium" />
          <el-option label="详细" value="long" />
        </el-select>
      </div>
    </div>

    <div class="chat-input__row">
      <textarea
        ref="textareaRef"
        v-model="text"
        class="chat-input__textarea"
        :placeholder="placeholder"
        :rows="1"
        :disabled="disabled"
        @keydown="onKeydown"
        @input="autoGrow"
      />

      <!-- 流式中：显示停止按钮 -->
      <el-tooltip v-if="disabled" content="停止生成" placement="top">
        <el-button
          class="chat-input__send-btn chat-input__send-btn--stop"
          type="danger"
          circle
          :icon="VideoPause"
          @click="store.abortStream()"
        />
      </el-tooltip>

      <!-- 空闲：显示发送按钮 -->
      <el-tooltip v-else content="发送" placement="top">
        <el-button
          class="chat-input__send-btn"
          type="primary"
          circle
          :icon="Promotion"
          :disabled="!canSend"
          @click="submit"
        />
      </el-tooltip>
    </div>

    <input
      ref="fileInputRef"
      type="file"
      accept="image/jpeg,image/png,image/webp"
      multiple
      class="chat-input__file"
      @change="onFileChange"
    />

    <div class="chat-input__hint">
      <span>Enter 发送，Shift + Enter 换行 · 最多 9 张图片 · jpg / png / webp</span>
      <span class="chat-input__quota">
        今日已用 {{ quotaUsed }} / {{ quotaLimit }}
        <template v-if="quotaLimit > 0 && quotaUsed >= quotaLimit">
          <el-tag size="small" type="danger">已用完</el-tag>
        </template>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { ArrowDown, ArrowUp, Close, Loading, Plus, Promotion, VideoPause } from '@element-plus/icons-vue'
import { getQuotaStatus } from '@/api/quota'
import { uploadImage } from '@/api/upload'
import { useConversationStore } from '@/stores/conversation'

const MAX_IMAGES = 9

const props = defineProps<{
  disabled?: boolean
  placeholder?: string
}>()

const emit = defineEmits<{
  (e: 'submit', payload: { text?: string; imageUrls?: string[] }): void
}>()

const store = useConversationStore()

const text = ref('')
const imageUrls = ref<string[]>([])
const uploading = ref(false)
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const showAdvanced = ref(false)
const quotaUsed = ref(0)
const quotaLimit = ref(0)

const fetchQuota = async () => {
  try {
    const status = await getQuotaStatus()
    quotaUsed.value = status.todayUsed
    quotaLimit.value = status.dailyLimit
  } catch {
    /* silently ignore */
  }
}

const placeholder = computed(
  () => props.placeholder || '直接输入文本 / 图片 + 文本，即可开始创作...',
)

const uploadTip = computed(() => {
  const remain = MAX_IMAGES - imageUrls.value.length
  if (remain <= 0) return '已达上限 9 张'
  return `上传图片（还可选 ${remain} 张）`
})

const canSend = computed(
  () =>
    !props.disabled &&
    !uploading.value &&
    (text.value.trim().length > 0 || imageUrls.value.length > 0) &&
    !(quotaLimit.value > 0 && quotaUsed.value >= quotaLimit.value),
)

function triggerPick() {
  if (props.disabled || uploading.value || imageUrls.value.length >= MAX_IMAGES) return
  fileInputRef.value?.click()
}

async function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = '' // 允许重复选同一文件

  if (files.length === 0) return

  const remain = MAX_IMAGES - imageUrls.value.length
  if (files.length > remain) {
    ElMessage.warning(`最多还能添加 ${remain} 张图片，已自动截取前 ${remain} 张`)
  }
  const toUpload = files.slice(0, remain)

  uploading.value = true
  const uploaded: string[] = []

  const results = await Promise.allSettled(
    toUpload.map((file) => uploadImage(file)),
  )

  let hasError = false
  for (const result of results) {
    if (hasError) break
    if (result.status === 'fulfilled') {
      uploaded.push(result.value.url)
    } else {
      /* 拦截器已统一显示后端错误消息 */
      hasError = true
    }
  }

  imageUrls.value = [...imageUrls.value, ...uploaded]
  uploading.value = false
}

function removeImage(idx: number) {
  imageUrls.value = imageUrls.value.filter((_, i) => i !== idx)
}

function autoGrow() {
  const el = textareaRef.value
  if (!el) return
  el.style.height = 'auto'
  const max = 6 * 20
  el.style.height = `${Math.min(el.scrollHeight, max)}px`
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
    e.preventDefault()
    submit()
  }
}

function submit() {
  if (!canSend.value) return
  emit('submit', {
    text: text.value.trim() || undefined,
    imageUrls: imageUrls.value.length > 0 ? imageUrls.value : undefined,
  })
  text.value = ''
  imageUrls.value = []
  void nextTick(autoGrow)
  // 刷新额度显示
  void fetchQuota()
}

onMounted(() => {
  void fetchQuota()
})
</script>

<style scoped lang="scss">
@use '@/styles/variables.scss' as *;

.chat-input {
  width: 100%;
  max-width: 1000px;
  margin: 0 auto;
  padding: 14px 18px 12px;
  border-radius: 22px;
  background: $bg-card;
  border: 1px solid $border-color;
  backdrop-filter: blur(20px);
  box-shadow: 0 18px 60px rgba(0, 0, 0, 0.35);

  @media (max-width: 767px) {
    max-width: none;
    border-radius: 16px;
    padding: 10px 12px 12px;
  }

  &__options {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;

    @media (max-width: 767px) {
      flex-wrap: wrap;
      gap: 8px;
    }
  }

  &__options-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__advanced-toggle {
    color: $text-muted;
    font-size: 12px;
  }

  &__advanced {
    display: flex;
    gap: 16px;
    margin-bottom: 10px;
    padding: 8px 12px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 10px;

    @media (max-width: 767px) {
      flex-direction: column;
      gap: 8px;
    }
  }

  &__advanced-item {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__label {
    font-size: 12px;
    color: $text-muted;
    white-space: nowrap;
  }

  &__image-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
  }

  &__upload-btn {
    width: 64px;
    height: 64px;
    border-radius: 10px;
    border: 1px dashed $border-color-strong;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: $text-muted;
    font-size: 20px;
    flex-shrink: 0;
    transition: all 0.2s;

    &:hover {
      border-color: $primary-color;
      color: $primary-color;
    }

    &.is-disabled {
      opacity: 0.4;
      cursor: not-allowed;
      pointer-events: none;
    }
  }

  &__image-chip {
    position: relative;
    display: inline-block;

    img {
      width: 64px;
      height: 64px;
      object-fit: cover;
      border-radius: 10px;
      border: 1px solid $border-color-strong;
    }
  }

  &__image-remove {
    position: absolute;
    top: -6px;
    right: -6px;
    width: 18px;
    height: 18px;
    background: rgba(0, 0, 0, 0.8);
    color: #fff;
    border-radius: 50%;
    cursor: pointer;
    font-size: 12px;
    display: flex;
    align-items: center;
    justify-content: center;

    &:hover {
      background: $color-danger;
    }
  }

  &__row {
    display: flex;
    align-items: flex-end;
    gap: 10px;
  }

  &__textarea {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: $text-primary;
    font-size: 12px;
    line-height: 20px;
    resize: none;
    min-height: 20px;
    max-height: 120px;
    font-family: inherit;
    padding: 6px 0;

    &::placeholder {
      color: $text-muted;
      font-size: 12px;
    }
  }

  &__file {
    display: none;
  }

  &__hint {
    margin-top: 8px;
    color: $text-muted;
    font-size: 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;

    @media (max-width: 767px) {
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;
      font-size: 11px;
    }
  }

  &__quota {
    color: $text-muted;
    font-size: 12px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  &__send-btn {
    flex-shrink: 0;

    &--stop {
      animation: stop-pulse 1.4s ease-in-out infinite;
    }
  }
}

@keyframes stop-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(248, 113, 113, 0.5); }
  50% { box-shadow: 0 0 0 8px rgba(248, 113, 113, 0); }
}
</style>
