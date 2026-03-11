/**
 * 中集智历 - 部门控制器
 */
import { Request, Response } from 'express'
import prisma from '../config/database.js'
import { ApiError } from '../middlewares/errorHandler.js'
import { AuthRequest } from '../middlewares/auth.js'
import * as statisticsService from '../services/statisticsService.js'

/**
 * 获取所有部门列表（系统管理员）
 */
export async function getDepartments(_req: Request, res: Response) {
  const departments = await prisma.department.findMany({
    include: {
      admin: {
        select: { id: true, nickname: true, email: true, avatar: true }
      },
      _count: {
        select: { members: true, projects: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  res.json({
    success: true,
    data: departments.map(dept => ({
      id: dept.id,
      name: dept.name,
      description: dept.description,
      admin: dept.admin,
      memberCount: dept._count.members,
      projectCount: dept._count.projects,
      createdAt: dept.createdAt,
      updatedAt: dept.updatedAt
    }))
  })
}

/**
 * 获取部门详情
 */
export async function getDepartmentById(req: Request, res: Response) {
  const { id } = req.params
  const currentUserId = (req as AuthRequest).userId

  const department = await prisma.department.findUnique({
    where: { id },
    include: {
      admin: {
        select: { id: true, nickname: true, email: true, avatar: true }
      },
      members: {
        select: {
          id: true,
          nickname: true,
          email: true,
          avatar: true,
          isAdmin: true,
          createdAt: true
        },
        orderBy: { createdAt: 'asc' }
      },
      _count: {
        select: { projects: true }
      }
    }
  })

  if (!department) {
    throw new ApiError(404, '部门不存在')
  }

  // 检查访问权限：系统管理员、本部门成员可查看完整信息
  const currentUser = await prisma.user.findUnique({
    where: { id: currentUserId },
    select: { isAdmin: true, departmentId: true }
  })

  const canViewFull = currentUser?.isAdmin || currentUser?.departmentId === id

  res.json({
    success: true,
    data: {
      id: department.id,
      name: department.name,
      description: department.description,
      admin: department.admin,
      members: canViewFull ? department.members : undefined,
      memberCount: department.members.length,
      projectCount: department._count.projects,
      createdAt: department.createdAt,
      updatedAt: department.updatedAt
    }
  })
}

/**
 * 创建部门（系统管理员）
 */
export async function createDepartment(req: Request, res: Response) {
  const { name, description, adminId } = req.body

  if (!name || !name.trim()) {
    throw new ApiError(400, '部门名称不能为空')
  }

  if (!adminId) {
    throw new ApiError(400, '请指定部门管理员')
  }

  // 检查部门名称是否已存在
  const existing = await prisma.department.findUnique({
    where: { name: name.trim() }
  })

  if (existing) {
    throw new ApiError(400, '部门名称已存在')
  }

  // 检查管理员是否存在
  const admin = await prisma.user.findUnique({
    where: { id: adminId }
  })

  if (!admin) {
    throw new ApiError(400, '指定的管理员不存在')
  }

  // 检查该用户是否已经是其他部门的管理员
  const existingManagedDept = await prisma.department.findUnique({
    where: { adminId }
  })

  if (existingManagedDept) {
    throw new ApiError(400, '该用户已经是其他部门的管理员')
  }

  // 创建部门并将管理员加入该部门
  const department = await prisma.department.create({
    data: {
      name: name.trim(),
      description,
      adminId,
      members: {
        connect: { id: adminId }
      }
    },
    include: {
      admin: {
        select: { id: true, nickname: true, email: true, avatar: true }
      }
    }
  })

  res.status(201).json({
    success: true,
    data: department,
    message: '部门创建成功'
  })
}

/**
 * 更新部门信息（系统管理员）
 */
export async function updateDepartment(req: Request, res: Response) {
  const { id } = req.params
  const { name, description } = req.body

  const department = await prisma.department.findUnique({
    where: { id }
  })

  if (!department) {
    throw new ApiError(404, '部门不存在')
  }

  // 如果要更改名称，检查是否重复
  if (name && name.trim() !== department.name) {
    const existing = await prisma.department.findUnique({
      where: { name: name.trim() }
    })

    if (existing) {
      throw new ApiError(400, '部门名称已存在')
    }
  }

  const updated = await prisma.department.update({
    where: { id },
    data: {
      name: name?.trim() || department.name,
      description: description ?? department.description
    },
    include: {
      admin: {
        select: { id: true, nickname: true, email: true, avatar: true }
      }
    }
  })

  res.json({
    success: true,
    data: updated,
    message: '部门信息更新成功'
  })
}

/**
 * 删除部门（系统管理员）
 */
export async function deleteDepartment(req: Request, res: Response) {
  const { id } = req.params
  const { targetDepartmentId } = req.body // 迁移目标部门（可选）

  const department = await prisma.department.findUnique({
    where: { id },
    include: {
      _count: {
        select: { members: true, projects: true }
      }
    }
  })

  if (!department) {
    throw new ApiError(404, '部门不存在')
  }

  if (department._count.members > 0 || department._count.projects > 0) {
    // 如果有成员或项目，需要指定迁移目标
    if (!targetDepartmentId) {
      throw new ApiError(400, '部门内还有成员或项目，请先迁移或指定目标部门')
    }

    const targetDept = await prisma.department.findUnique({
      where: { id: targetDepartmentId }
    })

    if (!targetDept) {
      throw new ApiError(400, '目标部门不存在')
    }

    if (targetDepartmentId === id) {
      throw new ApiError(400, '不能迁移到当前部门')
    }

    // 迁移成员和项目到目标部门
    await prisma.$transaction([
      prisma.user.updateMany({
        where: { departmentId: id },
        data: { departmentId: targetDepartmentId }
      }),
      prisma.project.updateMany({
        where: { departmentId: id },
        data: { departmentId: targetDepartmentId }
      })
    ])
  }

  await prisma.department.delete({
    where: { id }
  })

  res.json({
    success: true,
    message: '部门删除成功'
  })
}

/**
 * 获取我管理的部门（部门管理员）
 */
export async function getMyDepartment(req: Request, res: Response) {
  const currentUserId = (req as AuthRequest).userId

  const department = await prisma.department.findUnique({
    where: { adminId: currentUserId },
    include: {
      members: {
        select: {
          id: true,
          nickname: true,
          email: true,
          avatar: true,
          isAdmin: true,
          createdAt: true
        },
        orderBy: { createdAt: 'asc' }
      },
      projects: {
        select: { id: true, name: true },
        orderBy: { createdAt: 'desc' }
      },
      _count: {
        select: { projects: true }
      }
    }
  })

  if (!department) {
    throw new ApiError(404, '您不是部门管理员')
  }

  res.json({
    success: true,
    data: {
      id: department.id,
      name: department.name,
      description: department.description,
      members: department.members,
      projects: department.projects.slice(0, 10),
      projectCount: department._count.projects,
      createdAt: department.createdAt
    }
  })
}

/**
 * 添加部门成员（部门管理员）
 */
export async function addMember(req: Request, res: Response) {
  const { id } = req.params
  const { userId } = req.body
  const currentUserId = (req as AuthRequest).userId

  const department = await prisma.department.findUnique({
    where: { id }
  })

  if (!department) {
    throw new ApiError(404, '部门不存在')
  }

  // 检查权限：系统管理员或本部门管理员
  const currentUser = await prisma.user.findUnique({
    where: { id: currentUserId },
    select: { isAdmin: true }
  })

  if (!currentUser?.isAdmin && department.adminId !== currentUserId) {
    throw new ApiError(403, '无权管理此部门')
  }

  // 检查用户是否存在
  const user = await prisma.user.findUnique({
    where: { id: userId }
  })

  if (!user) {
    throw new ApiError(400, '用户不存在')
  }

  if (user.departmentId === id) {
    throw new ApiError(400, '该用户已在本部门')
  }

  if (user.departmentId) {
    throw new ApiError(400, '该用户已属于其他部门，请先从原部门移除')
  }

  // 添加成员
  await prisma.user.update({
    where: { id: userId },
    data: { departmentId: id }
  })

  res.json({
    success: true,
    message: '成员添加成功'
  })
}

/**
 * 移除部门成员（部门管理员）
 */
export async function removeMember(req: Request, res: Response) {
  const { id, userId } = req.params
  const currentUserId = (req as AuthRequest).userId

  const department = await prisma.department.findUnique({
    where: { id }
  })

  if (!department) {
    throw new ApiError(404, '部门不存在')
  }

  // 检查权限
  const currentUser = await prisma.user.findUnique({
    where: { id: currentUserId },
    select: { isAdmin: true }
  })

  if (!currentUser?.isAdmin && department.adminId !== currentUserId) {
    throw new ApiError(403, '无权管理此部门')
  }

  // 不能移除部门管理员
  if (userId === department.adminId) {
    throw new ApiError(400, '不能移除部门管理员，请先更换管理员')
  }

  // 检查用户是否在本部门
  const user = await prisma.user.findUnique({
    where: { id: userId }
  })

  if (!user || user.departmentId !== id) {
    throw new ApiError(400, '该用户不在本部门')
  }

  // 移除成员
  await prisma.user.update({
    where: { id: userId },
    data: { departmentId: null }
  })

  res.json({
    success: true,
    message: '成员已移除'
  })
}

/**
 * 更换部门管理员（系统管理员）
 */
export async function changeAdmin(req: Request, res: Response) {
  const { id } = req.params
  const { newAdminId } = req.body

  if (!newAdminId) {
    throw new ApiError(400, '请指定新的部门管理员')
  }

  const department = await prisma.department.findUnique({
    where: { id }
  })

  if (!department) {
    throw new ApiError(404, '部门不存在')
  }

  // 检查新管理员是否存在且在本部门
  const newAdmin = await prisma.user.findUnique({
    where: { id: newAdminId }
  })

  if (!newAdmin) {
    throw new ApiError(400, '指定的管理员不存在')
  }

  if (newAdmin.departmentId !== id) {
    throw new ApiError(400, '新管理员必须在本部门中')
  }

  // 更换管理员
  const updated = await prisma.department.update({
    where: { id },
    data: { adminId: newAdminId },
    include: {
      admin: {
        select: { id: true, nickname: true, email: true, avatar: true }
      }
    }
  })

  res.json({
    success: true,
    data: updated,
    message: '管理员更换成功'
  })
}

/**
 * 获取简单部门列表（用于下拉选择）
 */
export async function getDepartmentOptions(_req: Request, res: Response) {
  const departments = await prisma.department.findMany({
    select: {
      id: true,
      name: true
    },
    orderBy: { name: 'asc' }
  })

  res.json({
    success: true,
    data: departments
  })
}

/**
 * 获取部门仪表盘数据
 */
export async function getDepartmentDashboard(req: Request, res: Response) {
  const { id } = req.params
  const currentUserId = (req as AuthRequest).userId

  // 检查权限：系统管理员或本部门成员
  const currentUser = await prisma.user.findUnique({
    where: { id: currentUserId },
    select: { isAdmin: true, departmentId: true }
  })

  if (!currentUser?.isAdmin && currentUser?.departmentId !== id) {
    throw new ApiError(403, '无权查看此部门信息')
  }

  // 获取部门基本信息
  const department = await prisma.department.findUnique({
    where: { id },
    include: {
      admin: {
        select: { id: true, nickname: true, email: true, avatar: true }
      }
    }
  })

  if (!department) {
    throw new ApiError(404, '部门不存在')
  }

  // 获取统计数据
  const [taskStats, projectStats, members] = await Promise.all([
    statisticsService.calculateDepartmentTaskStats(id),
    statisticsService.calculateDepartmentProjectStats(id),
    prisma.user.findMany({
      where: { departmentId: id },
      select: {
        id: true,
        nickname: true,
        avatar: true
      }
    })
  ])

  // 获取成员工作负载
  const membersWithWorkload = await Promise.all(
    members.map(async (member) => ({
      ...member,
      workload: await statisticsService.calculateMemberWorkload(member.id)
    }))
  )

  // 获取部门项目
  const projects = await prisma.project.findMany({
    where: { departmentId: id, deletedAt: null },
    select: {
      id: true,
      name: true,
      _count: { select: { tasks: { where: { deletedAt: null } } } }
    },
    take: 10
  })

  // 计算项目进度
  const projectsWithProgress = await Promise.all(
    projects.map(async (project) => {
      const totalTasks = project._count.tasks
      const doneTasks = await prisma.task.count({
        where: { projectId: project.id, status: 'DONE', deletedAt: null }
      })
      return {
        id: project.id,
        name: project.name,
        taskCount: totalTasks,
        progress: totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0
      }
    })
  )

  // 获取最近任务
  const recentTasks = await prisma.task.findMany({
    where: {
      project: { departmentId: id },
      deletedAt: null
    },
    select: {
      id: true,
      title: true,
      status: true,
      dueDate: true,
      assignee: { select: { id: true, nickname: true } },
      project: { select: { id: true, name: true } }
    },
    orderBy: { updatedAt: 'desc' },
    take: 10
  })

  // 活跃成员统计（本周有任务更新的）
  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
  const activeMembers = await prisma.task.count({
    where: {
      project: { departmentId: id },
      updatedAt: { gte: oneWeekAgo },
      deletedAt: null
    }
  })

  res.json({
    success: true,
    data: {
      department: {
        id: department.id,
        name: department.name,
        description: department.description,
        adminId: department.adminId
      },
      statistics: {
        tasks: taskStats,
        projects: {
          active: projectStats.active,
          completed: projectStats.completed
        },
        members: {
          total: members.length,
          activeThisWeek: activeMembers
        }
      },
      members: membersWithWorkload,
      projects: projectsWithProgress,
      recentTasks
    }
  })
}

/**
 * 获取部门成员详情（含日历）
 */
export async function getMemberDetail(req: Request, res: Response) {
  const { id: departmentId, userId } = req.params
  const currentUserId = (req as AuthRequest).userId

  // 检查权限
  const currentUser = await prisma.user.findUnique({
    where: { id: currentUserId },
    select: { isAdmin: true, departmentId: true }
  })

  if (!currentUser?.isAdmin && currentUser?.departmentId !== departmentId) {
    throw new ApiError(403, '无权查看此成员信息')
  }

  // 检查用户是否在该部门
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      nickname: true,
      email: true,
      avatar: true,
      departmentId: true
    }
  })

  if (!user || user.departmentId !== departmentId) {
    throw new ApiError(404, '成员不存在或不在此部门')
  }

  // 获取用户的所有任务
  const tasks = await prisma.task.findMany({
    where: {
      assigneeId: userId,
      deletedAt: null,
      isArchived: false
    },
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
      dueDate: true,
      project: { select: { id: true, name: true } }
    },
    orderBy: { dueDate: 'asc' }
  })

  // 构建日历数据（按日期分组）
  const calendarMap = new Map<string, { date: string; taskCount: number; tasks: typeof tasks }>()

  for (const task of tasks) {
    if (task.dueDate) {
      const dateStr = new Date(task.dueDate).toISOString().split('T')[0]
      const existing = calendarMap.get(dateStr)
      if (existing) {
        existing.taskCount++
        existing.tasks.push(task)
      } else {
        calendarMap.set(dateStr, { date: dateStr, taskCount: 1, tasks: [task] })
      }
    }
  }

  const calendar = Array.from(calendarMap.values()).sort((a, b) => a.date.localeCompare(b.date))

  res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        nickname: user.nickname,
        email: user.email,
        avatar: user.avatar
      },
      tasks,
      calendar
    }
  })
}
