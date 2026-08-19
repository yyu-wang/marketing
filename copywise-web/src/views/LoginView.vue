<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-card__header">
        <h1>登录 Marketing Wise</h1>
        <p>智能营销文案助手 · 让创意触手可得</p>
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
            placeholder="请输入密码"
            show-password
            autocomplete="current-password"
          />
        </el-form-item>
        <el-button
          type="primary"
          class="auth-card__submit"
          native-type="submit"
          :loading="loading"
        >
          登录
        </el-button>
      </el-form>
      <div class="auth-card__footer">
        还没有账号？
        <RouterLink to="/register">立即注册</RouterLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { EMAIL_RULES, PASSWORD_BASE_RULES } from '@/utils/validation'
import { sha256 } from '@/utils/crypto'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const formRef = ref<FormInstance | null>(null)
const loading = ref(false)

const form = reactive({
  email: '',
  password: '',
})

const rules: FormRules = {
  email: EMAIL_RULES,
  password: PASSWORD_BASE_RULES,
}

const onSubmit = async (instance: FormInstance | null) => {
  if (!instance) return
  await instance.validate(async (valid) => {
    if (!valid) return
    loading.value = true
    try {
      const hashedPassword = await sha256(form.password)
      await auth.login({ email: form.email.trim(), password: hashedPassword, hashVersion: 1 })
      ElMessage.success('登录成功')
      const redirect = (route.query.redirect as string) || '/'
      await router.replace(redirect)
    } catch {
      /* 拦截器已统一显示后端错误消息 */
    } finally {
      loading.value = false
    }
  })
}
</script>

<style scoped lang="scss">
@use '@/styles/auth-page.scss';
</style>
