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
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 8, max: 64, message: '密码长度需 8-64 位', trigger: 'blur' },
  ],
}

const onSubmit = async (instance: FormInstance | null) => {
  if (!instance) return
  await instance.validate(async (valid) => {
    if (!valid) return
    loading.value = true
    try {
      await auth.login({ email: form.email.trim(), password: form.password })
      ElMessage.success('登录成功')
      const redirect = (route.query.redirect as string) || '/projects'
      await router.replace(redirect)
    } catch {
      /* 拦截器已弹错误提示 */
    } finally {
      loading.value = false
    }
  })
}
</script>

<style scoped lang="scss">
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #eef2ff, #faf5ff);
  padding: 24px;
  color: #1f2937;
}

.auth-card {
  width: 100%;
  max-width: 440px;
  background: #ffffff;
  padding: 48px 40px;
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(99, 102, 241, 0.15);

  &__header {
    margin-bottom: 32px;
    text-align: center;

    h1 {
      margin: 0 0 10px;
      font-size: 28px;
      font-weight: 700;
      color: #111827;
      letter-spacing: -0.02em;
    }
    p {
      margin: 0;
      color: #6b7280;
      font-size: 15px;
      line-height: 1.6;
    }
  }

  &__submit {
    width: 100%;
    margin-top: 8px;
    height: 48px;
    font-size: 16px;
    font-weight: 600;
    border-radius: 12px;
  }

  &__footer {
    margin-top: 28px;
    text-align: center;
    font-size: 14px;
    color: #6b7280;

    a {
      color: #6366f1;
      margin-left: 6px;
      font-weight: 600;
      text-decoration: none;

      &:hover {
        color: #4f46e5;
      }
    }
  }
}

:deep(.el-form-item__label) {
  color: #374151 !important;
  font-weight: 500;
  font-size: 14px;
}

:deep(.el-input__wrapper) {
  background-color: #f9fafb;
  border-radius: 10px;
  padding: 4px 14px;
  box-shadow: 0 0 0 1px #e5e7eb inset;
  transition: all 0.2s ease;

  &:hover {
    box-shadow: 0 0 0 1px #c7d2fe inset;
  }

  &.is-focus {
    box-shadow: 0 0 0 2px #6366f1 inset;
    background-color: #ffffff;
  }
}

:deep(.el-input__inner) {
  color: #111827;
  font-size: 15px;
  height: 44px;

  &::placeholder {
    color: #9ca3af;
  }
}
</style>
