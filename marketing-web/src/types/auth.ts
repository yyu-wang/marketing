export interface LoginPayload {
  email: string
  password: string
  /** 哈希版本：1 = SHA-256 */
  hashVersion: number
}

export interface RegisterPayload {
  nickname: string
  email: string
  password: string
  /** 哈希版本：1 = SHA-256 */
  hashVersion: number
}

export interface AuthResult {
  token: string
  userId: number
  email: string
  role: string
  nickname: string
}

export interface AuthUser {
  userId: number
  email: string
  role: string
  nickname: string
}
