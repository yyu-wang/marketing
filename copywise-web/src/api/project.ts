import { http } from '@/utils/request'
import type { Project, CreateProjectPayload, UpdateProjectPayload } from '@/types/project'

export const getProjectList = () => http.get<Project[]>('/projects')

export const getProject = (id: number) => http.get<Project>(`/projects/${id}`)

export const createProject = (data: CreateProjectPayload) =>
  http.post<Project>('/projects', data)

export const updateProject = (id: number, data: UpdateProjectPayload) =>
  http.put<Project>(`/projects/${id}`, data)

export const deleteProject = (id: number) =>
  http.delete<{ deleted: boolean }>(`/projects/${id}`)
