/**
 * 中集智历 - 用户相关API
 */
import { get, put } from '@/utils/request'
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
}): Promise<User> {
  const response = await put<User>(`/users/${id}`, data)
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
