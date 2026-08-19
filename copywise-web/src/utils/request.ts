import type { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios'
import axios from 'axios'
import router from '@/router'
import { ROUTE_PATH } from '@/router/routes'
import { useAuthStore } from '@/stores/auth'
import type { ApiErrorPayload, ApiResponse } from '@/types/api'

const baseURL = import.meta.env.VITE_API_BASE || '/api'

const instance = axios.create({
  baseURL,
  timeout: 30000,
})

export class ApiError extends Error {
  code: number
  constructor(message: string, code: number) {
    super(message)
    this.name = 'ApiError'
    this.code = code
  }
}

let redirecting = false

const AUTH_PATHS: readonly string[] = [ROUTE_PATH.LOGIN, ROUTE_PATH.REGISTER]

const redirectToLogin = async (): Promise<void> => {
  if (redirecting) return
  redirecting = true
  const auth = useAuthStore()
  auth.clearSession()
  const current = router.currentRoute.value
  if (AUTH_PATHS.includes(current.path)) {
    redirecting = false
    return
  }
  await router.replace({
    path: ROUTE_PATH.LOGIN,
    query: current.path === ROUTE_PATH.LOGIN ? {} : { redirect: current.fullPath },
  })
  redirecting = false
}

// ---------------------------------------------------------------------------
// 原生 DOM 错误提示（ElMessage 在 axios 拦截器上下文中无法正常工作）
// ---------------------------------------------------------------------------
function showErrorToast(message: string): void {
  const TOAST_DURATION = 4000

  const container = document.createElement('div')
  container.style.cssText =
    'position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:99999;pointer-events:none;'

  const toast = document.createElement('div')
  toast.textContent = message
  toast.style.cssText =
    'display:flex;align-items:center;gap:8px;padding:10px 20px;' +
    'background:#e74c3c;color:#fff;border-radius:8px;font-size:14px;' +
    'box-shadow:0 4px 16px rgba(0,0,0,0.3);' +
    'animation:toast-in 0.3s ease;'

  container.appendChild(toast)
  document.body.appendChild(container)

  setTimeout(() => {
    toast.style.opacity = '0'
    toast.style.transition = 'opacity 0.3s ease'
    setTimeout(() => container.remove(), 300)
  }, TOAST_DURATION)
}

// ---------------------------------------------------------------------------
// 注入 toast 入场动画样式
// ---------------------------------------------------------------------------
if (typeof document !== 'undefined') {
  const style = document.createElement('style')
  style.textContent =
    '@keyframes toast-in {' +
    'from { opacity:0; transform:translateY(-12px); }' +
    'to { opacity:1; transform:translateY(0); }' +
    '}'
  document.head.appendChild(style)
}

instance.interceptors.request.use((config) => {
  const auth = useAuthStore()
  if (auth.token) {
    config.headers.Authorization = `Bearer ${auth.token}`
  }
  return config
})

instance.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    const body = response.data
    if (body && typeof body.code === 'number') {
      if (body.code === 200) {
        return body.data as unknown as AxiosResponse
      }
      if (body.code === 401) {
        void redirectToLogin()
      }
      const message = body.message || '请求失败'
      showErrorToast(message)
      return Promise.reject(new ApiError(message, body.code))
    }

    return response.data as unknown as AxiosResponse
  },
  (error: AxiosError<ApiErrorPayload>) => {
    if (error.response?.status === 401 || error.response?.data?.code === 401) {
      void redirectToLogin()
      const message = error.response?.data?.message || '登录已过期，请重新登录'
      showErrorToast(message)
      return Promise.reject(new ApiError(message, 401))
    }

    const message = error.response?.data?.message || error.message || '网络异常，请稍后重试'
    showErrorToast(message)
    return Promise.reject(new ApiError(message, error.response?.status ?? 0))
  },
)

export const http = {
  get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return instance.get(url, config) as unknown as Promise<T>
  },
  post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return instance.post(url, data, config) as unknown as Promise<T>
  },
  put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return instance.put(url, data, config) as unknown as Promise<T>
  },
  patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return instance.patch(url, data, config) as unknown as Promise<T>
  },
  delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return instance.delete(url, config) as unknown as Promise<T>
  },
}

export default instance
