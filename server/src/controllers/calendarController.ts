/**
 * 中集智历 - 日历控制器
 */
import { Request, Response } from 'express'
import prisma from '../config/database.js'
import { AuthRequest } from '../middlewares/auth.js'

/**
 * 获取本周我参与项目的任务
 */
export async function getWeekProjectTasks(req: Request, res: Response) {
  const userId = (req as AuthRequest).userId

  // 计算本周的开始和结束日期
  const today = new Date()
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay() + 1) // 周一
  weekStart.setHours(0, 0, 0, 0)

  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6) // 周日
  weekEnd.setHours(23, 59, 59, 999)

  // 获取用户参与的项目
  const userProjects = await prisma.project.findMany({
    where: {
      deletedAt: null,
      OR: [
        { ownerId: userId },
        { members: { some: { userId } } },
        { departmentId: (await prisma.user.findUnique({
          where: { id: userId },
          select: { departmentId: true }
        }))?.departmentId }
      ]
    },
    select: { id: true, name: true }
  })

  if (userProjects.length === 0) {
    res.json({
      success: true,
      data: []
    })
    return
  }

  const projectIds = userProjects.map(p => p.id)

  // 获取这些项目在本周的任务
  const tasks = await prisma.task.findMany({
    where: {
      projectId: { in: projectIds },
      dueDate: { gte: weekStart, lte: weekEnd },
      deletedAt: null,
      isArchived: false,
      // 应用可见性规则
      OR: [
        // 私密任务：自己是创建者、负责人或协作者
        {
          visibility: 'PRIVATE',
          OR: [
            { creatorId: userId },
            { assigneeId: userId },
            { collaborators: { some: { userId } } }
          ]
        },
        // 公开任务
        {
          visibility: 'PUBLIC'
        }
      ]
    },
    include: {
      project: {
        select: { id: true, name: true }
      },
      assignee: {
        select: { id: true, nickname: true, avatar: true }
      },
      creator: {
        select: { id: true, nickname: true }
      }
    },
    orderBy: { dueDate: 'asc' }
  })

  // 按项目分组
  const groupedTasks = userProjects.map(project => ({
    projectId: project.id,
    projectName: project.name,
    tasks: tasks.filter(t => t.projectId === project.id)
  })).filter(g => g.tasks.length > 0)

  res.json({
    success: true,
    data: groupedTasks
  })
}
