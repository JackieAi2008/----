/**
 * 中集智历 - 仪表盘控制器
 */
import { Request, Response } from 'express'
import prisma from '../config/database.js'
import { getYearlyDashboard } from '../services/yearlyDashboardService.js'
import { ApiError } from '../middlewares/errorHandler.js'

/**
 * 获取仪表盘数据
 */
export async function getDashboard(req: Request, res: Response) {
  const userId = (req as { userId?: string }).userId!

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const threeDaysLater = new Date(today)
  threeDaysLater.setDate(threeDaysLater.getDate() + 3)

  const weekLater = new Date(today)
  weekLater.setDate(weekLater.getDate() + 7)

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)

  // 并行获取所有数据
  const [
    todayTasks,
    overdueTasks,
    upcomingTasks,
    weekTasks,
    monthStats,
    projectCount,
    recentProjects
  ] = await Promise.all([
    // 今日待办
    prisma.task.findMany({
      where: {
        OR: [
          { assigneeId: userId },
          { collaborators: { some: { userId } } }
        ],
        dueDate: { gte: today, lt: tomorrow },
        status: { notIn: ['DONE', 'CANCELLED'] },
        deletedAt: null
      },
      include: {
        project: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, color: true } }
      },
      orderBy: { dueDate: 'asc' }
    }),

    // 逾期任务
    prisma.task.findMany({
      where: {
        OR: [
          { assigneeId: userId },
          { collaborators: { some: { userId } } }
        ],
        dueDate: { lt: today },
        status: { notIn: ['DONE', 'CANCELLED'] },
        deletedAt: null
      },
      include: {
        project: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, color: true } }
      },
      orderBy: { dueDate: 'asc' },
      take: 10
    }),

    // 即将到期（3天内）
    prisma.task.findMany({
      where: {
        OR: [
          { assigneeId: userId },
          { collaborators: { some: { userId } } }
        ],
        dueDate: { gte: tomorrow, lt: threeDaysLater },
        status: { notIn: ['DONE', 'CANCELLED'] },
        deletedAt: null
      },
      include: {
        project: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, color: true } }
      },
      orderBy: { dueDate: 'asc' },
      take: 10
    }),

    // 本周任务统计（只统计公开任务）
    prisma.task.count({
      where: {
        OR: [
          { assigneeId: userId },
          { collaborators: { some: { userId } } }
        ],
        dueDate: { gte: today, lt: weekLater },
        deletedAt: null,
        visibility: 'PUBLIC'
      }
    }),

    // 本月统计（只统计公开任务）
    prisma.task.groupBy({
      by: ['status'],
      where: {
        OR: [
          { assigneeId: userId },
          { collaborators: { some: { userId } } }
        ],
        dueDate: { gte: monthStart, lte: monthEnd },
        deletedAt: null,
        visibility: 'PUBLIC'
      },
      _count: true
    }),

    // 参与的项目数
    prisma.projectMember.count({
      where: { userId }
    }),

    // 最近项目
    prisma.project.findMany({
      where: {
        members: { some: { userId } },
        deletedAt: null
      },
      include: {
        owner: { select: { id: true, nickname: true, avatar: true } },
        _count: { select: { tasks: { where: { deletedAt: null } } } }
      },
      orderBy: { updatedAt: 'desc' },
      take: 5
    })
  ])

  // 计算本月完成率
  const monthTotal = monthStats.reduce((sum, s) => sum + s._count, 0)
  const monthDone = monthStats.find(s => s.status === 'DONE')?._count || 0
  const completionRate = monthTotal > 0 ? Math.round((monthDone / monthTotal) * 100) : 0

  res.json({
    success: true,
    data: {
      todayTasks,
      overdueTasks,
      upcomingTasks,
      weekTasksCount: weekTasks,
      monthStats: {
        total: monthTotal,
        done: monthDone,
        completionRate
      },
      projectCount,
      recentProjects
    }
  })
}

/**
 * 获取工作统计
 */
export async function getWorkStats(req: Request, res: Response) {
  const userId = (req as { userId?: string }).userId!
  const { startDate, endDate } = req.query

  const start = startDate ? new Date(startDate as string) : new Date()
  start.setDate(start.getDate() - 30)
  start.setHours(0, 0, 0, 0)

  const end = endDate ? new Date(endDate as string) : new Date()
  end.setHours(23, 59, 59, 999)

  // 按状态统计（按创建时间筛选，包含在时间段内创建的所有任务）
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

  // 转换字段名：_count -> count
  const statusStats = statusStatsRaw.map(s => ({
    status: s.status,
    count: s._count
  }))

  // 按项目统计
  const projectStats = await prisma.task.groupBy({
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

  // 获取项目名称
  const projectIds = projectStats.map(s => s.projectId)
  const projects = await prisma.project.findMany({
    where: { id: { in: projectIds } },
    select: { id: true, name: true }
  })

  const projectStatsWithName = projectStats.map(s => ({
    projectId: s.projectId,
    projectName: projects.find(p => p.id === s.projectId)?.name || '未知项目',
    count: s._count
  }))

  res.json({
    success: true,
    data: {
      statusStats,
      projectStats: projectStatsWithName,
      dateRange: {
        start: start.toISOString(),
        end: end.toISOString()
      }
    }
  })
}

/**
 * 获取年度仪表盘数据 (R0 阶段 2)
 *
 * GET /api/dashboard/yearly?year=2026
 *
 * 业务定义见 yearlyDashboardService.ts:
 *   - 自然年 (1/1 ~ 12/31)
 *   - 我参与/可见 = assigneeId=me OR 协作人包含 me
 *   - yearlyTotal = 全年任务 (yearlyTotal cap = 10000)
 *   - yearlyTodo = 待办 (status 不在 DONE/CANCELLED)
 *   - yearlyOverdue = 逾期 (dueDate < now 且 status != DONE)
 *   - yearlyDone = 已完成
 *   - byMonth = 12 个月分布 (按 dueDate 的 UTC 月份聚合)
 */
export async function getYearlyDashboardController(req: Request, res: Response) {
  const userId = (req as { userId?: string }).userId!
  const yearParam = req.query.year

  if (yearParam === undefined || yearParam === null || yearParam === '') {
    throw new ApiError(400, '缺少 year 参数')
  }
  const yearStr = String(yearParam)
  // 严格解析:不允许 2026.5 这种 (parseInt 会 silently 截成 2026)
  const year = Number(yearStr)
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new ApiError(400, `year 越界: ${yearStr} (合法整数范围 2000..2100)`)
  }

  const data = await getYearlyDashboard(userId, year)

  res.json({
    success: true,
    data
  })
}
