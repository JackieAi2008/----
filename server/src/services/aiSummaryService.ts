/**
 * 中集智历 - AI 工作总结服务
 * 收集工作数据 → 构建 Prompt → 调用 DeepSeek API → 返回结构化总结
 */
import prisma from '../config/database.js'
import { deepseekConfig } from '../config/deepseek.js'

// ==================== 类型定义 ====================

export interface AISummaryRequest {
  type: 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  startDate: Date
  endDate: Date
}

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

export interface AISummaryResult {
  title: string
  period: { start: string; end: string; type: string }
  generatedAt: string
  sections: AISummarySections
}

// ==================== 数据收集 ====================

interface CollectedData {
  user: { nickname: string; department: string | null }
  tasks: any[]
  comments: any[]
  projects: any[]
  statusStats: { status: string; priority: string; count: number }[]
  auditLogs: any[]
  progressRecords: any[]
}

async function collectData(userId: string, start: Date, end: Date): Promise<CollectedData> {
  const [
    user,
    tasks,
    comments,
    projectMembers,
    statusStatsRaw,
    auditLogs,
    progressRecords
  ] = await Promise.all([
    // 用户信息
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        nickname: true,
        department: { select: { name: true } }
      }
    }),

    // 时间范围内的任务（完整详情）
    prisma.task.findMany({
      where: {
        AND: [
          {
            OR: [
              { assigneeId: userId },
              { collaborators: { some: { userId } } }
            ]
          },
          {
            OR: [
              { createdAt: { gte: start, lte: end } },
              { updatedAt: { gte: start, lte: end } },
              { dueDate: { gte: start, lte: end } }
            ]
          }
        ],
        deletedAt: null
      },
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: { id: true, nickname: true } },
        creator: { select: { id: true, nickname: true } },
        collaborators: { include: { user: { select: { id: true, nickname: true } } } }
      },
      orderBy: { updatedAt: 'desc' }
    }),

    // 评论活动（协作信号）
    prisma.comment.findMany({
      where: {
        userId,
        createdAt: { gte: start, lte: end },
        deletedAt: null
      },
      include: {
        task: { select: { id: true, title: true, project: { select: { name: true } } } }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    }),

    // 项目成员资格
    prisma.projectMember.findMany({
      where: { userId },
      include: {
        project: { select: { id: true, name: true, description: true } }
      }
    }),

    // 按状态和优先级分组统计
    prisma.task.groupBy({
      by: ['status', 'priority'],
      where: {
        AND: [
          {
            OR: [
              { assigneeId: userId },
              { collaborators: { some: { userId } } }
            ]
          },
          {
            OR: [
              { createdAt: { gte: start, lte: end } },
              { updatedAt: { gte: start, lte: end } },
              { dueDate: { gte: start, lte: end } }
            ]
          }
        ],
        deletedAt: null
      },
      _count: true
    }),

    // 审计日志（状态变更、字段修改记录）
    prisma.auditLog.findMany({
      where: {
        userId,
        targetType: 'TASK',
        createdAt: { gte: start, lte: end }
      },
      include: {
        user: { select: { nickname: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    }),

    // 进展记录
    prisma.comment.findMany({
      where: {
        userId,
        type: 'PROGRESS',
        createdAt: { gte: start, lte: end },
        deletedAt: null
      },
      include: {
        task: { select: { id: true, title: true, project: { select: { name: true } } } }
      },
      orderBy: { createdAt: 'desc' },
      take: 30
    })
  ])

  const statusStats = statusStatsRaw.map(s => ({
    status: s.status,
    priority: s.priority,
    count: s._count
  }))

  return {
    user: {
      nickname: user?.nickname || '未知用户',
      department: user?.department?.name || null
    },
    tasks,
    comments,
    projects: projectMembers.map(pm => pm.project),
    statusStats,
    auditLogs,
    progressRecords
  }
}

// ==================== Prompt 构建 ====================

function buildPrompt(data: CollectedData, type: string, start: Date, end: Date): string {
  const typeLabel = type === 'weekly' ? '周' : type === 'monthly' ? '月' : type === 'quarterly' ? '季度' : '年度'
  const dateStr = `${start.toISOString().split('T')[0]} 至 ${end.toISOString().split('T')[0]}`

  // 统计汇总
  const totalTasks = data.tasks.length
  const doneTasks = data.tasks.filter(t => t.status === 'DONE')
  const inProgressTasks = data.tasks.filter(t => t.status === 'IN_PROGRESS')
  const todoTasks = data.tasks.filter(t => t.status === 'TODO')
  const cancelledTasks = data.tasks.filter(t => t.status === 'CANCELLED')
  const completionRate = totalTasks > 0 ? Math.round((doneTasks.length / totalTasks) * 100) : 0

  // 按四象限优先级统计
  const importantUrgent = data.tasks.filter(t => t.priority === 'IMPORTANT_URGENT').length
  const importantNotUrgent = data.tasks.filter(t => t.priority === 'IMPORTANT_NOT_URGENT').length
  const urgentNotImportant = data.tasks.filter(t => t.priority === 'URGENT_NOT_IMPORTANT').length
  const notImportantNotUrgent = data.tasks.filter(t => t.priority === 'NOT_IMPORTANT_NOT_URGENT').length

  // 按项目分组
  const projectTaskMap = new Map<string, { name: string; tasks: any[] }>()
  for (const task of data.tasks) {
    const key = task.project?.id || 'unknown'
    if (!projectTaskMap.has(key)) {
      projectTaskMap.set(key, { name: task.project?.name || '未知项目', tasks: [] })
    }
    projectTaskMap.get(key)!.tasks.push(task)
  }

  // 格式化任务列表
  const formatTaskList = (tasks: any[]) => {
    if (tasks.length === 0) return '无'
    return tasks.slice(0, 15).map(t => {
      const priorityMap: Record<string, string> = {
        'IMPORTANT_URGENT': '重要且紧急',
        'IMPORTANT_NOT_URGENT': '重要不紧急',
        'URGENT_NOT_IMPORTANT': '紧急不重要',
        'NOT_IMPORTANT_NOT_URGENT': '不重要不紧急',
      }
      const priority = priorityMap[t.priority] || t.priority
      const project = t.project?.name || '未知项目'
      const dueDate = t.dueDate ? new Date(t.dueDate).toISOString().split('T')[0] : '无截止日期'
      const collaborators = t.collaborators?.map((c: any) => c.user?.nickname).filter(Boolean).join(', ')
      return `${t.title} [${priority}] - 项目:${project} - 截止:${dueDate}${collaborators ? ` - 协作人:${collaborators}` : ''}`
    }).join('\n')
  }

  // 评论活动汇总
  const commentSummary = data.comments.length > 0
    ? data.comments.slice(0, 10).map(c => {
        const projectName = c.task?.project?.name || '未知项目'
        return `在"${c.task?.title}"(${projectName})中参与了讨论`
      }).join('\n')
    : '无评论活动'

  // 项目进展概览
  const projectOverview = Array.from(projectTaskMap.entries())
    .map(([_, { name, tasks }]) => {
      const done = tasks.filter(t => t.status === 'DONE').length
      const inProgress = tasks.filter(t => t.status === 'IN_PROGRESS').length
      const todo = tasks.filter(t => t.status === 'TODO').length
      return `${name}: 共${tasks.length}项任务 (完成:${done} 进行中:${inProgress} 待办:${todo})`
    }).join('\n')

  const deptInfo = data.user.department ? ` (${data.user.department})` : ''

  // 审计日志摘要（状态变更等关键操作）
  const statusChanges = data.auditLogs.filter(l => l.action === 'STATUS_CHANGE')
  const auditSummary = statusChanges.length > 0
    ? statusChanges.slice(0, 10).map(l => {
        let details: any = {}
        try { details = JSON.parse(l.details || '{}') } catch { /* ignore */ }
        return `${l.createdAt.toISOString().split('T')[0]} ${details.oldValue || '?'} → ${details.newValue || '?'}`
      }).join('\n')
    : '无状态变更记录'

  // 进展记录摘要
  const progressSummary = data.progressRecords.length > 0
    ? data.progressRecords.slice(0, 10).map(p => {
        const project = p.task?.project?.name || '未知项目'
        return `${p.createdAt.toISOString().split('T')[0]} [${project}] ${p.content.substring(0, 80)}`
      }).join('\n')
    : '无进展记录'

  return `用户：${data.user.nickname}${deptInfo}
总结类型：${typeLabel}总结
时间范围：${dateStr}

=== 统计概览 ===
总任务：${totalTasks} | 已完成：${doneTasks.length} | 进行中：${inProgressTasks.length} | 待办：${todoTasks.length} | 已取消：${cancelledTasks.length}
完成率：${completionRate}%
重要且紧急：${importantUrgent} | 重要不紧急：${importantNotUrgent} | 紧急不重要：${urgentNotImportant} | 不重要不紧急：${notImportantNotUrgent}

=== 已完成任务 ===
${formatTaskList(doneTasks)}

=== 进行中任务 ===
${formatTaskList(inProgressTasks)}

=== 待办任务 ===
${formatTaskList(todoTasks)}

=== 评论参与（${data.comments.length}条） ===
${commentSummary}

=== 状态变更记录（${statusChanges.length}次） ===
${auditSummary}

=== 工作进展记录（${data.progressRecords.length}条） ===
${progressSummary}

=== 参与项目 ===
${projectOverview || '暂无项目'}

请根据以上数据生成${typeLabel}工作总结。注意结合进展记录和状态变更记录分析工作节奏和过程。`
}

function buildSystemPrompt(): string {
  return `你是中集智历协同日历系统的AI工作总结助手。根据用户提供的工作数据，生成专业、有洞察力的工作总结。

要求：
1. 分析数据中的模式和趋势，不要简单复述数字
2. 识别工作中的亮点和待改进之处
3. 给出具体可操作的建议
4. 语言专业但友好，使用中文
5. 必须返回严格的JSON格式

返回的JSON结构必须如下：
{
  "personalSummary": {
    "overview": "整体工作概述（2-3句话，概括这期工作的整体情况）",
    "completedWork": ["完成的主要工作1（具体描述）", "完成的主要工作2"],
    "inProgressWork": ["正在进行的工作1", "正在进行的工作2"],
    "workPatterns": "观察到的工作模式分析（如任务分布特点、优先级处理习惯等）"
  },
  "projectProgress": [
    {
      "projectName": "项目名称",
      "status": "进展良好 或 需关注 或 停滞",
      "summary": "项目进展概述（1-2句话）",
      "achievements": ["该项目取得的成就"],
      "blockers": ["阻碍因素（如有），没有则返回空数组"]
    }
  ],
  "teamCollaboration": {
    "collaborationOverview": "协作活动概述（评论参与情况、协作任务等）",
    "crossProjectInsights": "跨项目协作洞察（如发现同一人在多个项目中协作等模式）"
  },
  "keyHighlights": {
    "achievements": ["关键成就1（具体描述）", "关键成就2"],
    "improvements": ["待改进领域1（具体建议）"],
    "priorityAlerts": ["需要关注的事项（如逾期任务、重要且紧急待办等）"]
  },
  "suggestions": [
    {
      "category": "效率 或 优先级 或 协作 或 规划",
      "suggestion": "具体可操作的建议",
      "reason": "给出建议的依据"
    }
  ]
}

注意：
- personalSummary.completedWork 不要简单列出任务标题，要总结做了什么
- 如果数据量很少（比如只有1-2个任务），也要尽量给出有意义的分析
- projectProgress 数组每个项目一条记录
- suggestions 建议2-4条即可，要切实可行
- 所有文字使用中文`
}

// ==================== DeepSeek API 调用 ====================

async function callDeepSeekAPI(systemPrompt: string, userPrompt: string): Promise<AISummarySections> {
  if (!deepseekConfig.apiKey) {
    throw new Error('DEEPSEEK_API_KEY 未配置')
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), deepseekConfig.timeout)

  try {
    const response = await fetch(`${deepseekConfig.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${deepseekConfig.apiKey}`
      },
      body: JSON.stringify({
        model: deepseekConfig.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 2000
      }),
      signal: controller.signal
    })

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '')
      console.error(`[AI总结] DeepSeek API 错误: ${response.status} ${errorBody}`)

      if (response.status === 401 || response.status === 403) {
        throw new Error('AI总结服务认证失败')
      }
      if (response.status === 429) {
        throw new Error('AI总结请求过于频繁，请稍后再试')
      }
      throw new Error(`AI总结服务返回错误: ${response.status}`)
    }

    const result = await response.json() as any

    if (!result.choices?.[0]?.message?.content) {
      throw new Error('AI总结返回数据格式异常')
    }

    // 解析 JSON 内容
    const content = result.choices[0].message.content
    const parsed = JSON.parse(content) as AISummarySections

    // 基本校验
    if (!parsed.personalSummary || !parsed.keyHighlights) {
      throw new Error('AI总结返回数据结构不完整')
    }

    return parsed
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error('AI总结生成超时，请稍后重试')
    }
    // JSON 解析错误
    if (error instanceof SyntaxError) {
      console.error('[AI总结] JSON 解析失败:', error.message)
      throw new Error('AI总结返回格式异常')
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

// ==================== 主入口 ====================

export async function generateSummary(
  userId: string,
  type: 'weekly' | 'monthly' | 'quarterly' | 'yearly',
  startDate: Date,
  endDate: Date
): Promise<AISummaryResult> {
  // 1. 收集数据
  const data = await collectData(userId, startDate, endDate)

  // 2. 构建 Prompt
  const systemPrompt = buildSystemPrompt()
  const userPrompt = buildPrompt(data, type, startDate, endDate)

  // 3. 调用 AI
  const sections = await callDeepSeekAPI(systemPrompt, userPrompt)

  // 4. 构造结果
  const typeLabel = type === 'weekly' ? '周' : type === 'monthly' ? '月' : type === 'quarterly' ? '季度' : '年度'
  const dateStr = `${startDate.toISOString().split('T')[0]} ~ ${endDate.toISOString().split('T')[0]}`

  return {
    title: `${typeLabel}工作总结 (${dateStr})`,
    period: {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0],
      type
    },
    generatedAt: new Date().toISOString(),
    sections
  }
}

// ==================== 降级：基础统计摘要 ====================

export function generateFallbackSummary(
  type: 'weekly' | 'monthly' | 'quarterly' | 'yearly',
  _startDate: Date,
  _endDate: Date,
  statusStats: Array<{ status: string; count: number }>,
  projectStats: Array<{ projectName: string; count: number }>
): string {
  const typeLabel = type === 'weekly' ? '本周' : type === 'monthly' ? '本月' : type === 'quarterly' ? '本季度' : '本年度'
  const total = statusStats.reduce((sum, s) => sum + s.count, 0)
  const done = statusStats.find(s => s.status === 'DONE')?.count || 0
  const inProgress = statusStats.find(s => s.status === 'IN_PROGRESS')?.count || 0
  const todo = statusStats.find(s => s.status === 'TODO')?.count || 0
  const rate = total > 0 ? Math.round((done / total) * 100) : 0

  const projectLines = projectStats.length > 0
    ? projectStats.slice(0, 5).map(p => `- ${p.projectName}：${p.count} 项任务`).join('\n')
    : '- 暂无项目数据'

  return `【工作概述】
在${typeLabel}的工作中，共处理了 ${total} 项任务，完成 ${done} 项（完成率 ${rate}%），${inProgress} 项进行中，${todo} 项待办。

【项目参与】
${projectLines}

【下一步计划】
1. 优先处理逾期和进行中的任务
2. 按计划推进待办事项
3. 及时更新任务状态`
}
