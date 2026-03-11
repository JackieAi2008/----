/**
 * 中集智历 - 日历相关API
 */
import { get } from '@/utils/request'

/**
 * 周项目任务分组
 */
export interface WeekProjectTaskGroup {
  projectId: string
  projectName: string
  tasks: WeekTask[]
}

/**
 * 周任务
 */
export interface WeekTask {
  id: string
  title: string
  dueDate: string
  status: string
  priority: string
  visibility: string
  project: {
    id: string
    name: string
  }
  assignee?: {
    id: string
    nickname: string
    avatar: string | null
  }
  creator?: {
    id: string
    nickname: string
  }
}

/**
 * 获取本周我参与项目的任务
 */
export async function getWeekProjectTasks(): Promise<WeekProjectTaskGroup[]> {
  const response = await get<WeekProjectTaskGroup[]>('/calendar/week-project-tasks')
  return response.data ?? []
}
