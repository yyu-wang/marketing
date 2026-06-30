export interface Project {
  id: number
  userId: number
  name: string
  productDesc: string
  targetAudience?: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateProjectPayload {
  name: string
  productDesc: string
  targetAudience?: string
}

export type UpdateProjectPayload = Partial<CreateProjectPayload>
