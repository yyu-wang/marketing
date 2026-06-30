<template>
  <el-dialog
    :model-value="modelValue"
    title="编辑文案"
    width="720px"
    destroy-on-close
    :close-on-click-modal="false"
    @update:model-value="(v: boolean) => emit('update:modelValue', v)"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
      <el-form-item label="文案内容" prop="content">
        <el-input
          v-model="form.content"
          type="textarea"
          :rows="10"
          maxlength="1000"
          show-word-limit
          placeholder="请输入文案内容"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" :loading="loading" @click="onSubmit">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { updateCopy } from '@/api/copy'
import type { Copy } from '@/types/copy'

const props = defineProps<{
  modelValue: boolean
  copy?: Copy | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'saved', copy: Copy): void
}>()

const formRef = ref<FormInstance | null>(null)
const loading = ref(false)
const form = reactive({ content: '' })

const rules: FormRules = {
  content: [
    { required: true, message: '请输入文案内容', trigger: 'blur' },
    { max: 1000, message: '最多 1000 个字符', trigger: 'blur' },
  ],
}

watch(
  () => [props.modelValue, props.copy?.id],
  () => {
    if (props.modelValue && props.copy) form.content = props.copy.content
  },
)

const onSubmit = async () => {
  if (!formRef.value || !props.copy) return
  const target = props.copy
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    loading.value = true
    try {
      const saved = await updateCopy(target.id, form.content.trim())
      ElMessage.success('已保存')
      emit('saved', saved)
      emit('update:modelValue', false)
    } catch {
      /* 拦截器提示 */
    } finally {
      loading.value = false
    }
  })
}
</script>
