/**
 * 中集智历 - 管理控制器
 */
import { Request, Response } from 'express'
import prisma from '../config/database.js'
import { ApiError } from '../middlewares/errorHandler.js'
import { AuthRequest } from '../middlewares/auth.js'
import * as statisticsService from '../services/statisticsService.js'

/**
 * 获取系统管理仪表盘数据
 */
export async function getAdminDashboard(req: Request, res: Response) {
  const currentUserId = (req as AuthRequest).userId

  // 验证是否为系统管理员
  const user = await prisma.user.findUnique({
    where: { id: currentUserId },
    select: { isAdmin: true }
  })

  if (!user?.isAdmin) {
    throw new ApiError(403, '需要系统管理员权限')
  }

  // 获取全局统计
  const overview = await statisticsService.calculateGlobalStats()

  // 获取所有部门的统计
  const departments = await prisma.department.findMany({
    select: {
      id: true,
      name: true,
      _count: {
        select: { members: true, projects: true }
      }
    }
  })

  // 为每个部门计算任务统计
  const departmentsWithStats = await Promise.all(
    departments.map(async (dept) => {
      const taskStats = await statisticsService.calculateDepartmentTaskStats(dept.id)
      return {
        id: dept.id,
        name: dept.name,
        memberCount: dept._count.members,
        projectCount: dept._count.projects,
        taskStats: {
          todo: taskStats.todo,
          inProgress: taskStats.inProgress,
          done: taskStats.done
        }
      }
    })
  )

  res.json({
    success: true,
    data: {
      overview,
      departments: departmentsWithStats
    }
  })
}
