/**
 * 中集智历 - 用户相关API
 */
import { get, put, del, post } from '@/utils/request'
import type { User } from '@/types/user'

/**
 * 获取用户列表（管理员）
 */
export async function getUsers(): Promise<User[]> {
  const response = await get<User[]>('/users')
  return response.data ?? []
}

/**
 * 获取用户信息
 */
export async function getUser(id: string): Promise<User> {
  const response = await get<User>(`/users/${id}`)
  return response.data!
}

/**
 * 更新用户信息
 */
export async function updateUser(id: string, data: {
  nickname?: string
  bio?: string
  avatar?: string
  email?: string
}): Promise<User> {
  const response = await put<User>(`/users/${id}`, data)
  return response.data!
}

/**
 * 管理员创建用户
 */
export async function createUser(data: {
  email: string
  password: string
  nickname?: string
  departmentId?: string
}): Promise<User> {
  const response = await post<User>('/users/create', data)
  return response.data!
}

/**
 * 切换用户状态（启用/禁用）
 */
export async function toggleUserStatus(id: string): Promise<User> {
  const response = await put<User>(`/users/${id}/status`)
  return response.data!
}

/**
 * 删除用户
 */
export async function deleteUser(id: string): Promise<void> {
  await del(`/users/${id}`)
}

/**
 * 转让管理员权限
 */
export async function transferAdmin(id: string): Promise<{ message: string }> {
  const response = await post<{ message: string }>(`/users/${id}/transfer-admin`)
  return response.data!
}

/**
 * 搜索用户
 */
export async function searchUsers(keyword: string, projectId?: string): Promise<User[]> {
  const params: Record<string, string> = { keyword }
  if (projectId) {
    params.projectId = projectId
  }
  const response = await get<User[]>('/users/search', { params })
  return response.data ?? []
}

// ========== 部门管理员功能 ==========

export interface DepartmentMembersResponse {
  department: { id: string; name: string }
  members: Array<User & { isDepartmentAdmin: boolean }>
}

/**
 * 获取部门成员列表（部门管理员）
 */
export async function getDepartmentMembers(): Promise<DepartmentMembersResponse> {
  const response = await get<DepartmentMembersResponse>('/users/department/members')
  return response.data!
}

/**
 * 转让部门管理员权限
 */
export async function transferDepartmentAdmin(id: string): Promise<{ message: string }> {
  const response = await post<{ message: string }>(`/users/${id}/transfer-department-admin`)
  return response.data!
}

/**
 * 移除部门成员（部门管理员）
 */
export async function removeDepartmentMember(id: string): Promise<{ message: string }> {
  const response = await del<{ message: string }>(`/users/${id}/department`)
  return response.data!
}

/**
 * 禁用/启用部门成员（部门管理员）
 */
export async function toggleDepartmentMemberStatus(id: string): Promise<User & { message: string }> {
  const response = await put<User & { message: string }>(`/users/${id}/department-status`)
  return response.data!
}
