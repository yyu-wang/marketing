import { http } from '@/utils/request'
import type { CreateProjectPayload, Project, UpdateProjectPayload } from '@/types/project'

export const listProjects = () => http.get<Project[]>('/projects')

export const getProject = (id: number) => http.get<Project>(`/projects/${id}`)

export const createProject = (payload: CreateProjectPayload) =>
  http.post<Project>('/projects', payload)

export const updateProject = (id: number, payload: UpdateProjectPayload) =>
  http.put<Project>(`/projects/${id}`, payload)

export const deleteProject = (id: number) =>
  http.delete<{ deleted: true }>(`/projects/${id}`)
