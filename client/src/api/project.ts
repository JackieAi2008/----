/**
 * 中集智历 - 项目相关API
 */
import { get, post, put, del } from '@/utils/request'
import type {
  Project,
  ProjectMember,
  CreateProjectRequest,
  UpdateProjectRequest
} from '@/types/project'

/**
 * 获取项目列表
 */
export async function getProjects(): Promise<Project[]> {
  const response = await get<Project[]>('/projects')
  return response.data ?? []
}

/**
 * 获取公开项目列表
 */
export async function getPublicProjects(): Promise<Project[]> {
  const response = await get<Project[]>('/projects/public')
  return response.data ?? []
}

/**
 * 获取项目详情
 */
export async function getProject(id: string): Promise<Project> {
  const response = await get<Project>(`/projects/${id}`)
  return response.data!
}

/**
 * 创建项目
 */
export async function createProject(data: CreateProjectRequest): Promise<Project> {
  const response = await post<Project>('/projects', data)
  return response.data!
}

/**
 * 更新项目
 */
export async function updateProject(id: string, data: UpdateProjectRequest): Promise<Project> {
  const response = await put<Project>(`/projects/${id}`, data)
  return response.data!
}

/**
 * 删除项目
 */
export async function deleteProject(id: string): Promise<void> {
  await del(`/projects/${id}`)
}

/**
 * 获取项目成员
 */
export async function getProjectMembers(projectId: string): Promise<ProjectMember[]> {
  const response = await get<ProjectMember[]>(`/projects/${projectId}/members`)
  return response.data ?? []
}

/**
 * 添加项目成员
 */
export async function addProjectMember(
  projectId: string,
  userId: string
): Promise<ProjectMember> {
  const response = await post<ProjectMember>(`/projects/${projectId}/members`, { userId })
  return response.data!
}

/**
 * 移除项目成员
 */
export async function removeProjectMember(
  projectId: string,
  userId: string
): Promise<void> {
  await del(`/projects/${projectId}/members/${userId}`)
}

/**
 * 邀请用户加入项目
 */
export async function inviteUser(
  projectId: string,
  inviteeId: string
): Promise<void> {
  await post(`/projects/${projectId}/invite`, { inviteeId })
}

/**
 * 处理项目邀请
 */
export async function handleInvite(
  projectId: string,
  action: 'accept' | 'reject'
): Promise<void> {
  await post(`/projects/${projectId}/invite/${action}`)
}

/**
 * 已删除项目信息
 */
export interface DeletedProject {
  id: string
  name: string
  description?: string
  deletedAt: string
  daysRemaining: number
  taskCount: number
}

/**
 * 获取已删除的项目列表
 */
export async function getDeletedProjects(): Promise<DeletedProject[]> {
  const response = await get<DeletedProject[]>('/projects/deleted')
  return response.data ?? []
}

/**
 * 恢复已删除的项目
 */
export async function restoreProject(id: string): Promise<Project> {
  const response = await post<Project>(`/projects/${id}/restore`)
  return response.data!
}

/**
 * 永久删除项目
 */
export async function permanentDeleteProject(id: string): Promise<void> {
  await del(`/projects/${id}/permanent`)
}

/**
 * 移交项目负责人
 */
export async function transferProject(
  projectId: string,
  newOwnerId: string
): Promise<Project> {
  const response = await put<Project>(`/projects/${projectId}/transfer`, { newOwnerId })
  return response.data!
}
