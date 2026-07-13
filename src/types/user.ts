export interface User {
  id: number;
  email: string;
  role: string;
  isActive: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserPayload {
  email: string;
  password: string;
  role?: string;
}

export interface UpdateUserPayload {
  role?: string;
  isActive?: number;
}
