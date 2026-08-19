export interface User {
  id: number;
  email: string;
  nickname: string;
  role: string;
  isActive: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserPayload {
  email: string;
  password: string;
  nickname?: string;
  role?: string;
}

export interface UpdateUserPayload {
  nickname?: string;
  role?: string;
  isActive?: number;
}
