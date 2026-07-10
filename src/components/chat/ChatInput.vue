<template>
  <div class="chat-input">
    <div v-if="imageUrls.length > 0" class="chat-input__image-grid">
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
    </div>

    <div class="chat-input__row">
      <el-tooltip :content="uploadTip" placement="top">
        <el-button
          class="chat-input__upload-btn"
          :icon="Plus"
          circle
          :loading="uploading"
          :disabled="disabled || imageUrls.length >= 9"
          @click="triggerPick"
        />
      </el-tooltip>

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

      <el-tooltip :content="disabled ? '生成中...' : '发送'" placement="top">
        <el-button
          class="chat-input__send-btn"
          type="primary"
          circle
          :icon="Promotion"
          :loading="disabled"
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
      Enter 发送，Shift + Enter 换行 · 最多 9 张图片 · jpg / png / webp
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Close, Plus, Promotion } from '@element-plus/icons-vue'
import { uploadImage } from '@/api/upload'

const MAX_IMAGES = 9

const props = defineProps<{
  disabled?: boolean
  placeholder?: string
}>()

const emit = defineEmits<{
  (e: 'submit', payload: { text?: string; imageUrls?: string[] }): void
}>()

const text = ref('')
const imageUrls = ref<string[]>([])
const uploading = ref(false)
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)

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
    (text.value.trim().length > 0 || imageUrls.value.length > 0),
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

  for (const file of toUpload) {
    try {
      const res = await uploadImage(file)
      uploaded.push(res.url)
    } catch (err) {
      const msg = err instanceof Error ? err.message : '图片上传失败'
      ElMessage.error(msg)
      // 中断剩余上传
      break
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
  const max = 6 * 24
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
}
</script>

<style scoped lang="scss">
@use '@/styles/variables.scss' as *;

.chat-input {
  width: 100%;
  max-width: 760px;
  margin: 0 auto;
  padding: 14px 18px 12px;
  border-radius: 22px;
  background: $bg-card;
  border: 1px solid $border-color;
  backdrop-filter: blur(20px);
  box-shadow: 0 18px 60px rgba(0, 0, 0, 0.35);

  &__image-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 10px;
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
    font-size: 15px;
    line-height: 24px;
    resize: none;
    min-height: 24px;
    max-height: 144px;
    font-family: inherit;
    padding: 6px 0;

    &::placeholder {
      color: $text-muted;
    }
  }

  &__file {
    display: none;
  }

  &__hint {
    margin-top: 8px;
    color: $text-muted;
    font-size: 12px;
    text-align: right;
  }

  &__upload-btn,
  &__send-btn {
    flex-shrink: 0;
  }
}
</style>
