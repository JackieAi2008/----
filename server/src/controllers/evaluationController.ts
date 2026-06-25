/**
 * 中集智历 - 评价控制器
 * 全局管理者（isAdmin=true）可对部门所有工作进行五星评价
 */
import { Request, Response } from 'express'
import prisma from '../config/database.js'
import { ApiError } from '../middlewares/errorHandler.js'
import { AuthRequest } from '../middlewares/auth.js'

/**
 * 创建/更新评价
 * 仅管理员（isAdmin=true）可操作
 */
export async function createEvaluation(req: Request, res: Response) {
  const userId = (req as AuthRequest).userId
  const { taskId, targetUserId, rating, comment } = req.body

  // 参数校验
  if (!taskId || !targetUserId) {
    throw new ApiError(400, '请指定任务和被评价人')
  }
  if (!rating || rating < 1 || rating > 5) {
    throw new ApiError(400, '评分为1-5星')
  }

  // 检查任务是否存在
  const task = await prisma.task.findFirst({
    where: { id: taskId, deletedAt: null },
    select: { id: true, projectId: true, assigneeId: true }
  })

  if (!task) {
    throw new ApiError(404, '任务不存在')
  }

  // 权限检查：全局管理员 OR 项目所在部门的部门管理员
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true }
  })

  if (!currentUser?.isAdmin) {
    // 非全局管理员：必须是被评价任务所属项目所在部门的部门管理员
    const project = await prisma.project.findUnique({
      where: { id: task.projectId },
      select: { departmentId: true }
    })

    if (!project?.departmentId) {
      throw new ApiError(403, '仅全局管理员或部门管理员可以进行评价')
    }

    const department = await prisma.department.findUnique({
      where: { id: project.departmentId },
      select: { adminId: true }
    })

    if (department?.adminId !== userId) {
      throw new ApiError(403, '仅全局管理员或本部门管理员可以进行评价')
    }
  }

  // 检查被评价人是否是该任务的负责人或协作者
  const isAssignee = task.assigneeId === targetUserId
  const isCollaborator = await prisma.taskCollaborator.findUnique({
    where: { taskId_userId: { taskId, userId: targetUserId } }
  })

  if (!isAssignee && !isCollaborator) {
    throw new ApiError(400, '被评价人不是该任务的参与者')
  }

  // Upsert：同一评价人对同一任务的同一人只评一次
  const evaluation = await prisma.evaluation.upsert({
    where: {
      taskId_targetUserId_evaluatorId: {
        taskId,
        targetUserId,
        evaluatorId: userId!
      }
    },
    create: {
      taskId,
      evaluatorId: userId!,
      targetUserId,
      projectId: task.projectId,
      rating,
      comment
    },
    update: {
      rating,
      comment
    },
    include: {
      evaluator: { select: { id: true, nickname: true } },
      targetUser: { select: { id: true, nickname: true, avatar: true } },
      task: { select: { id: true, title: true } }
    }
  })

  res.json({
    success: true,
    data: evaluation
  })
}

/**
 * 获取任务的评价列表
 */
export async function getTaskEvaluations(req: Request, res: Response) {
  const { id } = req.params

  const evaluations = await prisma.evaluation.findMany({
    where: { taskId: id },
    include: {
      evaluator: { select: { id: true, nickname: true } },
      targetUser: { select: { id: true, nickname: true, avatar: true } }
    },
    orderBy: { createdAt: 'desc' }
  })

  res.json({
    success: true,
    data: evaluations
  })
}

/**
 * 获取人员评价统计
 * 按被评价人分组，计算平均分和评价次数
 */
export async function getUserEvaluationStats(req: Request, res: Response) {
  const userId = (req as AuthRequest).userId
  const { projectId, targetUserId } = req.query

  // 权限检查
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true }
  })

  if (!currentUser?.isAdmin) {
    throw new ApiError(403, '仅全局管理员可以查看评价统计')
  }

  // 构建查询条件
  const where: Record<string, unknown> = {}
  if (projectId) where.projectId = projectId
  if (targetUserId) where.targetUserId = targetUserId

  // 获取原始评价数据
  const evaluations = await prisma.evaluation.findMany({
    where,
    include: {
      targetUser: { select: { id: true, nickname: true, avatar: true } },
      project: { select: { id: true, name: true, category: true } }
    }
  })

  // 按被评价人分组统计
  const userStatsMap = new Map<string, {
    user: { id: string; nickname: string | null; avatar: string | null }
    totalRating: number
    count: number
    byProject: Map<string, { project: { id: string; name: string; category: string | null }; totalRating: number; count: number }>
  }>()

  for (const ev of evaluations) {
    if (!userStatsMap.has(ev.targetUserId)) {
      userStatsMap.set(ev.targetUserId, {
        user: ev.targetUser,
        totalRating: 0,
        count: 0,
        byProject: new Map()
      })
    }
    const stat = userStatsMap.get(ev.targetUserId)!
    stat.totalRating += ev.rating
    stat.count++

    const projKey = ev.projectId
    if (!stat.byProject.has(projKey)) {
      stat.byProject.set(projKey, {
        project: ev.project,
        totalRating: 0,
        count: 0
      })
    }
    const projStat = stat.byProject.get(projKey)!
    projStat.totalRating += ev.rating
    projStat.count++
  }

  const stats = Array.from(userStatsMap.values()).map(stat => ({
    user: stat.user,
    averageRating: Math.round((stat.totalRating / stat.count) * 10) / 10,
    evaluationCount: stat.count,
    byProject: Array.from(stat.byProject.values()).map(ps => ({
      project: ps.project,
      averageRating: Math.round((ps.totalRating / ps.count) * 10) / 10,
      evaluationCount: ps.count
    }))
  }))

  res.json({
    success: true,
    data: stats
  })
}

/**
 * 获取项目维度的评价统计
 */
export async function getProjectEvaluationStats(req: Request, res: Response) {
  const userId = (req as AuthRequest).userId

  // 权限检查
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true }
  })

  if (!currentUser?.isAdmin) {
    throw new ApiError(403, '仅全局管理员可以查看评价统计')
  }

  // 获取所有评价
  const evaluations = await prisma.evaluation.findMany({
    include: {
      targetUser: { select: { id: true, nickname: true } },
      project: { select: { id: true, name: true, category: true } }
    }
  })

  // 按项目分组
  const projectMap = new Map<string, {
    project: { id: string; name: string; category: string | null }
    evaluations: Array<{ targetUser: { id: string; nickname: string | null }; rating: number; comment: string | null; createdAt: Date }>
    averageRating: number
  }>()

  for (const ev of evaluations) {
    if (!projectMap.has(ev.projectId)) {
      projectMap.set(ev.projectId, {
        project: ev.project,
        evaluations: [],
        averageRating: 0
      })
    }
    projectMap.get(ev.projectId)!.evaluations.push({
      targetUser: ev.targetUser,
      rating: ev.rating,
      comment: ev.comment,
      createdAt: ev.createdAt
    })
  }

  const stats = Array.from(projectMap.values()).map(p => {
    const total = p.evaluations.reduce((s, e) => s + e.rating, 0)
    p.averageRating = Math.round((total / p.evaluations.length) * 10) / 10
    return p
  })

  res.json({
    success: true,
    data: stats
  })
}
