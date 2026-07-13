export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  email: string
  password: string
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
