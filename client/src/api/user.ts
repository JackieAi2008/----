/**
 * 中集智历 - 用户相关API
 */
import { get, put } from '@/utils/request'
import type { User } from '@/types/user'

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
export async function searchUsers(keyword: string): Promise<User[]> {
  const response = await get<User[]>('/users/search', { params: { keyword } })
  return response.data ?? []
}
