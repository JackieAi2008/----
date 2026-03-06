/**
 * 中集智历 - 任务模板相关API
 */
import { get, post, put, del } from '@/utils/request'
import type { TaskTemplate, CreateTemplateRequest, UpdateTemplateRequest } from '@/types/task'

/**
 * 获取模板列表
 */
export async function getTemplates(params?: {
  categoryId?: string
}): Promise<TaskTemplate[]> {
  const response = await get<TaskTemplate[]>('/templates', { params })
  return response.data ?? []
}

/**
 * 获取模板详情
 */
export async function getTemplate(id: string): Promise<TaskTemplate> {
  const response = await get<TaskTemplate>(`/templates/${id}`)
  return response.data!
}

/**
 * 创建模板
 */
export async function createTemplate(data: CreateTemplateRequest): Promise<TaskTemplate> {
  const response = await post<TaskTemplate>('/templates', data)
  return response.data!
}

/**
 * 从任务创建模板
 */
export async function createTemplateFromTask(taskId: string): Promise<TaskTemplate> {
  const response = await post<TaskTemplate>(`/templates/from-task/${taskId}`)
  return response.data!
}

/**
 * 更新模板
 */
export async function updateTemplate(id: string, data: UpdateTemplateRequest): Promise<TaskTemplate> {
  const response = await put<TaskTemplate>(`/templates/${id}`, data)
  return response.data!
}

/**
 * 删除模板
 */
export async function deleteTemplate(id: string): Promise<void> {
  await del(`/templates/${id}`)
}
