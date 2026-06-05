/**
 * 中集智历 - 评价相关API
 */
import { get, post } from '@/utils/request'
import type { Evaluation } from '@/types/task'

/**
 * 创建/更新评价
 */
export async function createEvaluation(data: {
  taskId: string
  targetUserId: string
  rating: number
  comment?: string
}): Promise<Evaluation> {
  const response = await post<Evaluation>('/evaluations', data)
  return response.data!
}

/**
 * 获取任务的评价列表
 */
export async function getTaskEvaluations(taskId: string): Promise<Evaluation[]> {
  const response = await get<Evaluation[]>(`/evaluations/task/${taskId}`)
  return response.data ?? []
}

/**
 * 获取人员评价统计
 */
export async function getUserEvaluationStats(params?: {
  projectId?: string
  targetUserId?: string
}): Promise<UserEvaluationStat[]> {
  const response = await get<UserEvaluationStat[]>('/evaluations/user-stats', { params })
  return response.data ?? []
}

/**
 * 获取项目评价统计
 */
export async function getProjectEvaluationStats(): Promise<ProjectEvaluationStat[]> {
  const response = await get<ProjectEvaluationStat[]>('/evaluations/project-stats')
  return response.data ?? []
}

// 人员评价统计
export interface UserEvaluationStat {
  user: {
    id: string
    nickname: string
    avatar: string | null
  }
  averageRating: number
  evaluationCount: number
  byProject: Array<{
    project: {
      id: string
      name: string
      category: string | null
    }
    averageRating: number
    evaluationCount: number
  }>
}

// 项目评价统计
export interface ProjectEvaluationStat {
  project: {
    id: string
    name: string
    category: string | null
  }
  evaluations: Array<{
    targetUser: {
      id: string
      nickname: string
    }
    rating: number
    comment: string | null
    createdAt: string
  }>
  averageRating: number
}
