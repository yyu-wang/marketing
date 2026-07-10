import type { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios'
import axios from 'axios'
import { ElMessage } from 'element-plus'
import router from '@/router'
import { ROUTE_PATH } from '@/router/routes'
import { useAuthStore } from '@/stores/auth'
import type { ApiErrorPayload, ApiResponse } from '@/types/api'

const baseURL = import.meta.env.VITE_API_BASE || '/api'

const instance = axios.create({
  baseURL,
  timeout: 30000,
})

let redirecting = false

const redirectToLogin = async (): Promise<void> => {
  if (redirecting) return
  redirecting = true
  const auth = useAuthStore()
  auth.clearSession()
  const current = router.currentRoute.value
  await router.replace({
    path: ROUTE_PATH.LOGIN,
    query: current.path === ROUTE_PATH.LOGIN ? {} : { redirect: current.fullPath },
  })
  redirecting = false
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
      ElMessage.error(body.message || '请求失败')
      return Promise.reject(body)
    }

    return response.data as unknown as AxiosResponse
  },
  (error: AxiosError<ApiErrorPayload>) => {
    if (error.response?.status === 401 || error.response?.data?.code === 401) {
      void redirectToLogin()
      ElMessage.error(error.response?.data?.message || '登录已过期，请重新登录')
      return Promise.reject(error)
    }

    const message = error.response?.data?.message || error.message || '网络异常，请稍后重试'
    ElMessage.error(message)
    return Promise.reject(error)
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
