const TOKEN_KEY = 'copywise_token'
const USER_KEY = 'copywise_user'

export interface StoredUser {
  userId: number
  email: string
}

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY)

export const setToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token)
}

export const clearToken = (): void => {
  localStorage.removeItem(TOKEN_KEY)
}

export const getStoredUser = (): StoredUser | null => {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as StoredUser
  } catch {
    return null
  }
}

export const setStoredUser = (user: StoredUser): void => {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export const clearStoredUser = (): void => {
  localStorage.removeItem(USER_KEY)
}
