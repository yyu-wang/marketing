<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-card__header">
        <h1>登录 CopyWise</h1>
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
import { useQuotaStore } from '@/stores/quota'

const auth = useAuthStore()
const quota = useQuotaStore()
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
      await quota.refresh().catch(() => undefined)
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
  background: linear-gradient(135deg, #f0f3ff, #fbf7ff);
  padding: 24px;
}

.auth-card {
  width: 100%;
  max-width: 420px;
  background: #ffffff;
  padding: 40px 36px;
  border-radius: 16px;
  box-shadow: 0 16px 40px rgba(15, 36, 81, 0.08);

  &__header {
    margin-bottom: 28px;

    h1 {
      margin: 0 0 8px;
      font-size: 24px;
    }
    p {
      margin: 0;
      color: #646a73;
      font-size: 13px;
    }
  }

  &__submit {
    width: 100%;
    margin-top: 8px;
  }

  &__footer {
    margin-top: 24px;
    text-align: center;
    font-size: 13px;
    color: #646a73;

    a {
      color: #409eff;
      margin-left: 4px;
    }
  }
}
</style>
