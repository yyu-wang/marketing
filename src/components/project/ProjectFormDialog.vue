<template>
  <el-dialog
    :model-value="modelValue"
    :title="isEdit ? '编辑项目' : '新建项目'"
    width="520px"
    :close-on-click-modal="false"
    destroy-on-close
    @update:model-value="(v: boolean) => emit('update:modelValue', v)"
    @close="onClose"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-position="top"
      @submit.prevent="onSubmit"
    >
      <el-form-item label="项目名称" prop="name">
        <el-input v-model="form.name" placeholder="例如：夏季新品手冲咖啡" maxlength="50" show-word-limit />
      </el-form-item>
      <el-form-item label="产品描述" prop="productDesc">
        <el-input
          v-model="form.productDesc"
          type="textarea"
          :rows="4"
          placeholder="描述产品卖点、风格、价格等关键信息"
          maxlength="500"
          show-word-limit
        />
      </el-form-item>
      <el-form-item label="目标人群（可选）" prop="targetAudience">
        <el-input
          v-model="form.targetAudience"
          placeholder="例如：25-35 岁都市白领"
          maxlength="200"
          show-word-limit
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" :loading="loading" @click="onSubmit">
        {{ isEdit ? '保存' : '创建' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { createProject, updateProject } from '@/api/project'
import type { CreateProjectPayload, Project } from '@/types/project'

const props = defineProps<{
  modelValue: boolean
  project?: Project | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'saved', project: Project): void
}>()

const formRef = ref<FormInstance | null>(null)
const loading = ref(false)

const form = reactive<CreateProjectPayload>({
  name: '',
  productDesc: '',
  targetAudience: '',
})

const isEdit = computed(() => Boolean(props.project?.id))

const rules: FormRules = {
  name: [
    { required: true, message: '请输入项目名称', trigger: 'blur' },
    { max: 50, message: '最多 50 个字符', trigger: 'blur' },
  ],
  productDesc: [
    { required: true, message: '请输入产品描述', trigger: 'blur' },
    { max: 500, message: '最多 500 个字符', trigger: 'blur' },
  ],
  targetAudience: [{ max: 200, message: '最多 200 个字符', trigger: 'blur' }],
}

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    if (props.project) {
      form.name = props.project.name
      form.productDesc = props.project.productDesc
      form.targetAudience = props.project.targetAudience ?? ''
    } else {
      form.name = ''
      form.productDesc = ''
      form.targetAudience = ''
    }
  },
)

const onClose = () => {
  formRef.value?.resetFields()
}

const onSubmit = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    loading.value = true
    try {
      const payload: CreateProjectPayload = {
        name: form.name.trim(),
        productDesc: form.productDesc.trim(),
      }
      if (form.targetAudience?.trim()) payload.targetAudience = form.targetAudience.trim()

      const saved = isEdit.value && props.project
        ? await updateProject(props.project.id, payload)
        : await createProject(payload)
      ElMessage.success(isEdit.value ? '已更新' : '已创建')
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
