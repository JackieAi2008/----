/**
 * 中集智历 - 标签相关API
 */
import { get, post, put } from '@/utils/request'

// 标签颜色类型
export interface TagColor {
  name: string
  value: string
  bgClass: string
  textClass: string
}

// 标签类型
export interface Tag {
  name: string
  color: TagColor
}

/**
 * 获取所有标签
 */
export async function getTags(projectId?: string): Promise<Tag[]> {
  const url = projectId ? `/tags?projectId=${projectId}` : '/tags'
  const response = await get<Tag[]>(url)
  return response.data ?? []
}

/**
 * 获取预定义标签颜色
 */
export async function getTagColors(): Promise<TagColor[]> {
  const response = await get<TagColor[]>('/tags/colors')
  return response.data ?? []
}

/**
 * 创建标签（验证并返回带颜色的标签对象）
 */
export async function createTag(name: string): Promise<Tag> {
  const response = await post<Tag>('/tags', { name })
  return response.data!
}

/**
 * 更新任务标签
 */
export async function updateTaskTags(taskId: string, tags: string[]): Promise<void> {
  await put(`/tags/tasks/${taskId}`, { tags })
}
