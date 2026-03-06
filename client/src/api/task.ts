/**
 * 中集智历 - 任务相关API
 */
import { get, post, put, del } from '@/utils/request'
import type {
  Task,
  TaskCategory,
  CreateTaskRequest,
  UpdateTaskRequest
} from '@/types/task'

/**
 * 获取任务列表
 */
export async function getTasks(params?: {
  projectId?: string
  assigneeId?: string
  status?: string
  startDate?: string
  endDate?: string
}): Promise<Task[]> {
  const response = await get<Task[]>('/tasks', { params })
  return response.data ?? []
}

/**
 * 获取任务详情
 */
export async function getTask(id: string): Promise<Task> {
  const response = await get<Task>(`/tasks/${id}`)
  return response.data!
}

/**
 * 创建任务
 */
export async function createTask(data: CreateTaskRequest): Promise<Task> {
  const response = await post<Task>('/tasks', data)
  return response.data!
}

/**
 * 更新任务
 */
export async function updateTask(id: string, data: UpdateTaskRequest): Promise<Task> {
  const response = await put<Task>(`/tasks/${id}`, data)
  return response.data!
}

/**
 * 删除任务
 */
export async function deleteTask(id: string): Promise<void> {
  await del(`/tasks/${id}`)
}

/**
 * 获取任务类别列表
 */
export async function getTaskCategories(projectId?: string): Promise<TaskCategory[]> {
  const url = projectId ? `/tasks/categories?projectId=${projectId}` : '/tasks/categories'
  const response = await get<TaskCategory[]>(url)
  return response.data ?? []
}

/**
 * 创建任务类别
 */
export async function createTaskCategory(data: {
  projectId?: string
  name: string
  color: string
}): Promise<TaskCategory> {
  const response = await post<TaskCategory>('/tasks/categories', data)
  return response.data!
}

/**
 * 添加任务协作者
 */
export async function addTaskCollaborator(taskId: string, userId: string): Promise<void> {
  await post(`/tasks/${taskId}/collaborators`, { userId })
}

/**
 * 移除任务协作者
 */
export async function removeTaskCollaborator(taskId: string, userId: string): Promise<void> {
  await del(`/tasks/${taskId}/collaborators/${userId}`)
}

/**
 * 归档已完成超过30天的任务
 */
export async function archiveCompletedTasks(): Promise<{ count: number }> {
  const response = await post<{ count: number }>('/tasks/archive-completed')
  return response.data!
}

/**
 * 获取已归档任务列表
 */
export async function getArchivedTasks(params?: {
  projectId?: string
}): Promise<Task[]> {
  const response = await get<Task[]>('/tasks/archived', { params })
  return response.data ?? []
}

/**
 * 恢复归档任务
 */
export async function unarchiveTask(id: string): Promise<Task> {
  const response = await put<Task>(`/tasks/${id}/unarchive`)
  return response.data!
}

/**
 * 批量更新任务
 */
export async function batchUpdateTasks(data: {
  taskIds: string[]
  status?: 'TODO' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED'
  priority?: 'HIGH' | 'MEDIUM' | 'LOW'
}): Promise<{ count: number }> {
  const response = await put<{ count: number }>('/tasks/batch', data)
  return response.data!
}

/**
 * 批量删除任务
 */
export async function batchDeleteTasks(taskIds: string[]): Promise<{ count: number }> {
  const response = await del<{ count: number }>('/tasks/batch', { data: { taskIds } })
  return response.data!
}

/**
 * 批量归档任务
 */
export async function batchArchiveTasks(taskIds: string[]): Promise<{ count: number }> {
  const response = await post<{ count: number }>('/tasks/batch/archive', { taskIds })
  return response.data!
}

/**
 * 获取所有标签
 */
export async function getAllTags(projectId?: string): Promise<string[]> {
  const url = projectId ? `/tasks/tags?projectId=${projectId}` : '/tasks/tags'
  const response = await get<string[]>(url)
  return response.data ?? []
}

/**
 * 更新任务标签
 */
export async function updateTaskTags(id: string, tags: string[]): Promise<Task> {
  const response = await put<Task>(`/tasks/${id}/tags`, { tags })
  return response.data!
}
