import type { FormItemRule } from 'element-plus'

export const EMAIL_RULES: FormItemRule[] = [
  { required: true, message: '请输入邮箱', trigger: 'blur' },
  { type: 'email', message: '邮箱格式不正确', trigger: 'blur' },
]

export const PASSWORD_BASE_RULES: FormItemRule[] = [
  { required: true, message: '请输入密码', trigger: 'blur' },
  { min: 8, max: 64, message: '密码长度需 8-64 位', trigger: 'blur' },
]

export const passwordPatternRule: FormItemRule = {
  validator: (_rule, value: string, callback) => {
    if (!value) return callback()
    const hasLetter = /[A-Za-z]/.test(value)
    const hasDigit = /\d/.test(value)
    if (!hasLetter || !hasDigit) {
      return callback(new Error('密码需同时包含字母和数字'))
    }
    callback()
  },
  trigger: 'blur',
}
