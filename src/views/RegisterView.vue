<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-card__header">
        <h1>注册 Marketing Wise</h1>
        <p>10 秒注册，开启你的 AI 文案之旅</p>
      </div>
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        size="large"
        @submit.prevent="onSubmit(formRef)"
      >
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="form.email" placeholder="请输入邮箱" autocomplete="username" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="8-64 位，需包含字母和数字"
            show-password
            autocomplete="new-password"
          />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirm">
          <el-input
            v-model="form.confirm"
            type="password"
            placeholder="再次输入密码"
            show-password
            autocomplete="new-password"
          />
        </el-form-item>
        <el-button
          type="primary"
          class="auth-card__submit"
          native-type="submit"
          :loading="loading"
        >
          注册并登录
        </el-button>
      </el-form>
      <div class="auth-card__footer">
        已有账号？
        <RouterLink to="/login">直接登录</RouterLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { EMAIL_RULES, PASSWORD_BASE_RULES, passwordPatternRule } from '@/utils/validation'
import { sha256 } from '@/utils/crypto'

const auth = useAuthStore()
const router = useRouter()

const formRef = ref<FormInstance | null>(null)
const loading = ref(false)

const form = reactive({
  email: '',
  password: '',
  confirm: '',
})

const rules: FormRules = {
  email: EMAIL_RULES,
  password: [...PASSWORD_BASE_RULES, passwordPatternRule],
  confirm: [
    { required: true, message: '请再次输入密码', trigger: 'blur' },
    {
      validator: (_rule, value: string, callback) => {
        if (value !== form.password) return callback(new Error('两次密码不一致'))
        callback()
      },
      trigger: 'blur',
    },
  ],
}

const onSubmit = async (instance: FormInstance | null) => {
  if (!instance) return
  await instance.validate(async (valid) => {
    if (!valid) return
    loading.value = true
    try {
      const hashedPassword = await sha256(form.password)
      await auth.register({ email: form.email.trim(), password: hashedPassword, hashVersion: 1 })
      ElMessage.success('注册成功')
      await router.replace('/')
    } catch {
      /* 拦截器提示 */
    } finally {
      loading.value = false
    }
  })
}
</script>

<style scoped lang="scss">
@use '@/styles/auth-page.scss';
</style>
