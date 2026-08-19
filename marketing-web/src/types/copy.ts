export interface Copy {
  id: number
  projectId: number
  channel: string
  content: string
  isStarred: boolean
  isEdited: boolean
  createdAt: string
  updatedAt: string
}

export interface UpdateCopyPayload {
  content: string
}

export interface BatchDeletePayload {
  ids: number[]
}
