import { defineStore } from 'pinia'
import * as authApi from '@/api/auth'
import type { AuthResult, AuthUser, LoginPayload, RegisterPayload } from '@/types/auth'
import {
  clearStoredUser,
  clearToken,
  getStoredUser,
  getToken,
  setStoredUser,
  setToken,
} from '@/utils/token'

interface AuthState {
  token: string | null
  user: AuthUser | null
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    token: null,
    user: null,
  }),
  getters: {
    isLoggedIn: (state) => Boolean(state.token),
    isAdmin: (state) => state.user?.role === 'admin',
  },
  actions: {
    hydrate() {
      const token = getToken()
      const user = getStoredUser()
      if (token) this.token = token
      if (user) this.user = user
    },
    applyAuthResult(result: AuthResult) {
      this.token = result.token
      this.user = { userId: result.userId, email: result.email, role: result.role }
      setToken(result.token)
      setStoredUser(this.user)
    },
    async login(payload: LoginPayload): Promise<void> {
      const result = await authApi.login(payload)
      this.applyAuthResult(result)
    },
    async register(payload: RegisterPayload): Promise<void> {
      const result = await authApi.register(payload)
      this.applyAuthResult(result)
    },
    clearSession() {
      this.token = null
      this.user = null
      clearToken()
      clearStoredUser()
    },
    async logout() {
      this.clearSession()
    },
  },
})
