/**
 * 中集智历 - 搜索相关API
 */
import { get } from '@/utils/request'
import type { Task } from '@/types/task'
import type { Project } from '@/types/project'

// 搜索结果类型
export interface SearchResult {
  keyword: string
  tasks: Array<{
    id: string
    title: string
    description?: string
    projectName?: string
    dueDate: string
    status: string
    highlight?: string
  }>
  projects: Array<{
    id: string
    name: string
    description?: string
    memberCount: number
    visibility: string
  }>
  users: Array<{
    id: string
    nickname: string
    avatar?: string
    email: string
  }>
  total: number
}

// 搜索参数
export interface SearchParams {
  keyword: string
  types?: string // 'task,project,user'
}

/**
 * 全局搜索
 */
export async function globalSearch(params: SearchParams): Promise<SearchResult> {
  const query = new URLSearchParams()
  query.append('keyword', params.keyword)
  if (params.types) {
    query.append('types', params.types)
  }

  const response = await get<SearchResult>(`/search?${query.toString()}`)
  return response.data!
}

/**
 * 快速搜索任务
 */
export async function searchTasks(keyword: string, projectId?: string): Promise<Task[]> {
  const query = new URLSearchParams()
  query.append('keyword', keyword)
  if (projectId) {
    query.append('projectId', projectId)
  }

  const response = await get<Task[]>(`/search/tasks?${query.toString()}`)
  return response.data ?? []
}

/**
 * 快速搜索项目
 */
export async function searchProjects(keyword: string): Promise<Project[]> {
  const response = await get<Project[]>(`/search/projects?keyword=${encodeURIComponent(keyword)}`)
  return response.data ?? []
}
