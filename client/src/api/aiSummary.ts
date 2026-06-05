/**
 * 中集智历 - AI 智能总结 API
 */
import { post } from '@/utils/request'

// ==================== 请求类型 ====================

export interface AISummaryRequest {
  type: 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  startDate?: string
  endDate?: string
}

// ==================== 响应类型 ====================

export interface PersonalSummary {
  overview: string
  completedWork: string[]
  inProgressWork: string[]
  workPatterns: string
}

export interface ProjectProgress {
  projectName: string
  status: string
  summary: string
  achievements: string[]
  blockers: string[]
}

export interface TeamCollaboration {
  collaborationOverview: string
  crossProjectInsights: string
}

export interface KeyHighlights {
  achievements: string[]
  improvements: string[]
  priorityAlerts: string[]
}

export interface Suggestion {
  category: string
  suggestion: string
  reason: string
}

export interface AISummarySections {
  personalSummary: PersonalSummary
  projectProgress: ProjectProgress[]
  teamCollaboration: TeamCollaboration
  keyHighlights: KeyHighlights
  suggestions: Suggestion[]
}

export interface AISummaryResponse {
  title: string
  period: {
    start: string
    end: string
    type: string
  }
  generatedAt: string
  sections?: AISummarySections
  fallback?: boolean
  fallbackMessage?: string
  basicContent?: string
}

// ==================== API 函数 ====================

/**
 * 生成 AI 智能工作总结
 */
export async function generateAISummary(params: AISummaryRequest): Promise<AISummaryResponse> {
  const response = await post<AISummaryResponse>('/dashboard/ai-summary', params, {
    timeout: 60000 // AI 生成可能需要较长时间
  })
  return response.data!
}
