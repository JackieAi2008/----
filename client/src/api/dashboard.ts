/**
 * 中集智历 - 仪表盘相关API
 */
import { get } from '@/utils/request'
import type { Task } from '@/types/task'
import type { Project } from '@/types/project'

// 仪表盘数据类型
export interface DashboardData {
  todayTasks: Task[]
  overdueTasks: Task[]
  upcomingTasks: Task[]
  weekTasksCount: number
  monthStats: {
    total: number
    done: number
    completionRate: number
  }
  projectCount: number
  recentProjects: Array<Project & { _count?: { tasks: number } }>
}

// 工作统计类型
export interface WorkStats {
  statusStats: Array<{ status: string; _count: number }>
  projectStats: Array<{ projectId: string; projectName: string; count: number }>
  dateRange: { start: string; end: string }
}

/**
 * 获取仪表盘数据
 */
export async function getDashboard(): Promise<DashboardData> {
  const response = await get<DashboardData>('/dashboard')
  return response.data!
}

/**
 * 获取工作统计
 */
export async function getWorkStats(params?: {
  startDate?: string
  endDate?: string
}): Promise<WorkStats> {
  const query = new URLSearchParams()
  if (params?.startDate) query.append('startDate', params.startDate)
  if (params?.endDate) query.append('endDate', params.endDate)

  const url = `/dashboard/stats${query.toString() ? '?' + query.toString() : ''}`
  const response = await get<WorkStats>(url)
  return response.data!
}
