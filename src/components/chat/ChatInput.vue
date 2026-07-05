<template>
  <div class="chat-input">
    <div v-if="imageUrl" class="chat-input__image-chip">
      <img :src="resolvedImageUrl" alt="待发送图片" />
      <el-icon class="chat-input__image-remove" @click="clearImage">
        <Close />
      </el-icon>
    </div>

    <div class="chat-input__row">
      <el-tooltip content="上传图片" placement="top">
        <el-button
          class="chat-input__upload-btn"
          :icon="Plus"
          circle
          :loading="uploading"
          :disabled="disabled"
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
      class="chat-input__file"
      @change="onFileChange"
    />

    <div class="chat-input__hint">
      Enter 发送，Shift + Enter 换行 · 支持 jpg / png / webp，最大 5 MB
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Close, Plus, Promotion } from '@element-plus/icons-vue'
import { uploadImage } from '@/api/upload'

const props = defineProps<{
  disabled?: boolean
  placeholder?: string
}>()

const emit = defineEmits<{
  (e: 'submit', payload: { text?: string; imageUrl?: string }): void
}>()

const text = ref('')
const imageUrl = ref<string | null>(null)
const uploading = ref(false)
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)

const placeholder = computed(
  () => props.placeholder || '直接输入文本 / 图片 + 文本，即可开始创作...',
)

const canSend = computed(
  () =>
    !props.disabled &&
    !uploading.value &&
    (text.value.trim().length > 0 || !!imageUrl.value),
)

/**
 * 图片 URL 处理：后端返回相对路径 /uploads/xxx，
 * 前端 dev 走 vite 代理（/uploads 也代理到 server）；
 * 直接预览相对路径即可。
 */
const resolvedImageUrl = computed(() => imageUrl.value || '')

function triggerPick() {
  if (props.disabled || uploading.value) return
  fileInputRef.value?.click()
}

async function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = '' // 允许重复选同一文件
  if (!file) return

  if (file.size > 5 * 1024 * 1024) {
    ElMessage.error('图片大小不能超过 5MB')
    return
  }
  uploading.value = true
  try {
    const res = await uploadImage(file)
    imageUrl.value = res.url
  } catch (err) {
    const msg = err instanceof Error ? err.message : '图片上传失败'
    ElMessage.error(msg)
  } finally {
    uploading.value = false
  }
}

function clearImage() {
  imageUrl.value = null
}

function autoGrow() {
  const el = textareaRef.value
  if (!el) return
  el.style.height = 'auto'
  const max = 6 * 24 // 6 行
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
    imageUrl: imageUrl.value || undefined,
  })
  text.value = ''
  imageUrl.value = null
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

  &__image-chip {
    position: relative;
    display: inline-block;
    margin-bottom: 10px;

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
