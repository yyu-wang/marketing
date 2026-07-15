export interface LoginPayload {
  email: string
  password: string
  /** 哈希版本：1 = SHA-256 */
  hashVersion: number
}

export interface RegisterPayload {
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
}

export interface AuthUser {
  userId: number
  email: string
  role: string
}
