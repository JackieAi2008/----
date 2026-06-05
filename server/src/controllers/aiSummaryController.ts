/**
 * 中集智历 - AI 工作总结控制器
 */
import { Request, Response } from 'express'
import { AuthRequest } from '../middlewares/auth.js'
import { generateSummary, generateFallbackSummary } from '../services/aiSummaryService.js'
import prisma from '../config/database.js'

/**
 * 生成 AI 工作总结
 * POST /api/dashboard/ai-summary
 */
export async function generateAISummary(req: Request, res: Response) {
  const userId = (req as AuthRequest).userId!
  const { type, startDate, endDate } = req.body

  // 参数校验
  const validTypes = ['weekly', 'monthly', 'quarterly', 'yearly']
  if (!type || !validTypes.includes(type)) {
    return res.status(400).json({
      success: false,
      message: '总结类型无效，请选择 weekly、monthly、quarterly 或 yearly'
    })
  }

  // 计算日期范围
  const now = new Date()
  let start: Date
  let end: Date

  if (startDate && endDate) {
    start = new Date(startDate)
    end = new Date(endDate)
    end.setHours(23, 59, 59, 999)
  } else {
    end = new Date(now)
    end.setHours(23, 59, 59, 999)
    start = new Date(now)
    start.setHours(0, 0, 0, 0)

    switch (type) {
      case 'weekly': {
        const day = now.getDay() || 7
        start.setDate(now.getDate() - day + 1)
        break
      }
      case 'monthly':
        start.setDate(1)
        break
      case 'quarterly': {
        const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3
        start.setMonth(quarterStartMonth, 1)
        break
      }
      case 'yearly':
        start.setMonth(0, 1)
        break
    }
  }

  try {
    const result = await generateSummary(userId, type as 'weekly' | 'monthly' | 'quarterly' | 'yearly', start, end)

    res.json({
      success: true,
      data: result
    })
  } catch (error: any) {
    console.error('[AI总结] 生成失败:', error.message)

    // 降级：返回基础统计摘要
    try {
      const statusStatsRaw = await prisma.task.groupBy({
        by: ['status'],
        where: {
          OR: [
            { assigneeId: userId },
            { collaborators: { some: { userId } } }
          ],
          createdAt: { gte: start, lte: end },
          deletedAt: null
        },
        _count: true
      })

      const projectStatsRaw = await prisma.task.groupBy({
        by: ['projectId'],
        where: {
          OR: [
            { assigneeId: userId },
            { collaborators: { some: { userId } } }
          ],
          createdAt: { gte: start, lte: end },
          deletedAt: null
        },
        _count: true
      })

      const projectIds = projectStatsRaw.map(s => s.projectId)
      const projects = await prisma.project.findMany({
        where: { id: { in: projectIds } },
        select: { id: true, name: true }
      })

      const statusStats = statusStatsRaw.map(s => ({
        status: s.status,
        count: s._count
      }))

      const projectStats = projectStatsRaw.map(s => ({
        projectName: projects.find(p => p.id === s.projectId)?.name || '未知项目',
        count: s._count
      }))

      const fallbackContent = generateFallbackSummary(
        type as 'weekly' | 'monthly' | 'quarterly' | 'yearly',
        start, end, statusStats, projectStats
      )

      const typeLabel = type === 'weekly' ? '周' : type === 'monthly' ? '月' : type === 'quarterly' ? '季度' : '年度'
      const dateStr = `${start.toISOString().split('T')[0]} ~ ${end.toISOString().split('T')[0]}`

      res.json({
        success: true,
        data: {
          title: `${typeLabel}工作总结 (${dateStr})`,
          period: {
            start: start.toISOString().split('T')[0],
            end: end.toISOString().split('T')[0],
            type
          },
          generatedAt: new Date().toISOString(),
          fallback: true,
          fallbackMessage: 'AI总结生成失败，已生成基础统计摘要',
          basicContent: fallbackContent
        }
      })
    } catch (fallbackError) {
      // 降级也失败了
      res.status(500).json({
        success: false,
        message: '总结生成失败，请稍后重试'
      })
    }
  }
}
