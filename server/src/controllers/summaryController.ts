/**
 * 中集智历 - 项目工作总结控制器
 * 项目负责人 / 超管可写工作总结；项目成员可见；部门管理员 + 超管可触发 AI 总结
 */
import { Request, Response } from 'express'
import prisma from '../config/database.js'
import { ApiError } from '../middlewares/errorHandler.js'
import { AuthRequest } from '../middlewares/auth.js'

/**
 * 权限工具：当前用户是否是项目 owner 或全局管理员
 */
async function isProjectOwnerOrAdmin(userId: string, projectId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true }
  })
  if (user?.isAdmin) return true

  const project = await prisma.project.findFirst({
    where: { id: projectId, deletedAt: null },
    select: { ownerId: true }
  })
  return project?.ownerId === userId
}

/**
 * 权限工具：当前用户是否是项目成员
 */
async function isProjectMember(userId: string, projectId: string): Promise<boolean> {
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } }
  })
  return !!member
}

/**
 * 创建工作总结
 * POST /api/projects/:id/summaries
 */
export async function createSummary(req: Request, res: Response) {
  const userId = (req as AuthRequest).userId!
  const { id: projectId } = req.params
  const { title, content } = req.body

  if (!title || !content) {
    throw new ApiError(400, '请填写标题和内容')
  }

  if (!(await isProjectOwnerOrAdmin(userId, projectId))) {
    throw new ApiError(403, '仅项目负责人或全局管理员可写工作总结')
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, deletedAt: null },
    select: { id: true }
  })
  if (!project) {
    throw new ApiError(404, '项目不存在')
  }

  const summary = await prisma.projectSummary.create({
    data: {
      projectId,
      authorId: userId,
      title,
      content,
      summaryType: 'WORK'
    },
    include: {
      author: { select: { id: true, nickname: true, avatar: true } }
    }
  })

  res.status(201).json({
    success: true,
    data: summary
  })
}

/**
 * 获取项目工作总结列表
 * GET /api/projects/:id/summaries
 */
export async function listSummaries(req: Request, res: Response) {
  const userId = (req as AuthRequest).userId!
  const { id: projectId } = req.params

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true }
  })

  if (!(await isProjectMember(userId, projectId)) && !user?.isAdmin) {
    throw new ApiError(403, '仅项目成员可查看工作总结')
  }

  const summaries = await prisma.projectSummary.findMany({
    where: { projectId },
    include: {
      author: { select: { id: true, nickname: true, avatar: true } }
    },
    orderBy: { createdAt: 'desc' }
  })

  res.json({
    success: true,
    data: summaries
  })
}

/**
 * 触发 AI 总结
 * POST /api/projects/:id/summaries/:summaryId/ai-summary
 *
 * 简化版项目级 AI 总结：先按任务状态生成基础统计摘要，并尝试调用 DeepSeek。
 * AI 调用失败时直接返回基础摘要，不阻塞前端展示。
 */
export async function generateProjectSummaryAI(req: Request, res: Response) {
  const userId = (req as AuthRequest).userId!
  const { id: projectId, summaryId } = req.params

  // 权限：项目负责人、全局管理员、部门管理员（按 Department.adminId 反查）
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true }
  })

  if (!user?.isAdmin) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
      select: { departmentId: true, ownerId: true }
    })
    if (!project) {
      throw new ApiError(404, '项目不存在')
    }
    if (project.ownerId !== userId && project.departmentId) {
      const dept = await prisma.department.findUnique({
        where: { id: project.departmentId },
        select: { adminId: true }
      })
      if (dept?.adminId !== userId) {
        throw new ApiError(403, '仅项目负责人、全局管理员或部门管理员可触发 AI 总结')
      }
    } else if (project.ownerId !== userId) {
      throw new ApiError(403, '仅项目负责人、全局管理员或部门管理员可触发 AI 总结')
    }
  }

  const summary = await prisma.projectSummary.findFirst({
    where: { id: summaryId, projectId }
  })
  if (!summary) {
    throw new ApiError(404, '工作总结不存在')
  }

  // 收集项目内任务状态统计
  const statusStatsRaw = await prisma.task.groupBy({
    by: ['status'],
    where: { projectId, deletedAt: null },
    _count: true
  })

  const total = statusStatsRaw.reduce((s, x) => s + x._count, 0)
  const done = statusStatsRaw.find(s => s.status === 'DONE')?._count || 0
  const inProgress = statusStatsRaw.find(s => s.status === 'IN_PROGRESS')?._count || 0
  const todo = statusStatsRaw.find(s => s.status === 'TODO')?._count || 0
  const cancelled = statusStatsRaw.find(s => s.status === 'CANCELLED')?._count || 0
  const rate = total > 0 ? Math.round((done / total) * 100) : 0

  // 收集项目内最近任务
  const recentTasks = await prisma.task.findMany({
    where: { projectId, deletedAt: null },
    select: { id: true, title: true, status: true, dueDate: true },
    orderBy: { updatedAt: 'desc' },
    take: 10
  })

  const recentTaskLines = recentTasks.length > 0
    ? recentTasks.map(t => '- ' + t.title + '（' + t.status + '）').join('\n')
    : '- 暂无任务数据'

  const fallbackContent = '【项目工作总结 - ' + summary.title + '】\n\n基于作者提交的内容（' + summary.content.slice(0, 60) + (summary.content.length > 60 ? '…' : '') + '），本项目当前共 ' + total + ' 项任务：完成 ' + done + ' 项（完成率 ' + rate + '%），进行中 ' + inProgress + ' 项，待办 ' + todo + ' 项，已取消 ' + cancelled + ' 项。\n\n【最近任务动态】\n' + recentTaskLines + '\n\n【下一步建议】\n1. 优先处理进行中和待办任务，按 dueDate 排序\n2. 已完成任务可考虑归档\n3. 关键路径上的延期任务应升级处理'

  // 尝试 DeepSeek 调用：失败则返回降级
  let aiContent: string | null = null
  let fallback = true
  const deepseekKey = process.env.DEEPSEEK_API_KEY
  if (deepseekKey) {
    try {
      const prompt = '请基于以下项目工作总结内容生成简明的工作总结（200字以内）：\n\n' + summary.content + '\n\n任务统计：共 ' + total + ' 项，完成 ' + done + ' 项（' + rate + '%），进行中 ' + inProgress + ' 项，待办 ' + todo + ' 项。'
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 15000)
      const resp = await fetch((process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com') + '/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + deepseekKey
        },
        body: JSON.stringify({
          model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.5,
          max_tokens: 600
        }),
        signal: controller.signal
      })
      clearTimeout(timer)
      if (resp.ok) {
        const data = await resp.json() as any
        const text = data?.choices?.[0]?.message?.content
        if (typeof text === 'string' && text.trim()) {
          aiContent = text.trim()
          fallback = false
        }
      }
    } catch {
      // 走降级
    }
  }

  const finalContent = aiContent || fallbackContent

  const updated = await prisma.projectSummary.update({
    where: { id: summaryId },
    data: {
      aiContent: finalContent,
      aiGeneratedAt: new Date()
    },
    include: {
      author: { select: { id: true, nickname: true, avatar: true } }
    }
  })

  res.json({
    success: true,
    data: updated,
    fallback
  })
}