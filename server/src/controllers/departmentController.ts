/**
 * 中集智历 - 部门控制器
 */
import { Request, Response } from 'express'
import prisma from '../config/database.js'
import { ApiError } from '../middlewares/errorHandler.js'
import { AuthRequest } from '../middlewares/auth.js'

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
