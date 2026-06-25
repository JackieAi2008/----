/**
 * 中集智历 - 用户控制器
 */
import { Request, Response } from 'express'
import prisma from '../config/database.js'
import { ApiError } from '../middlewares/errorHandler.js'
import { AuthRequest } from '../middlewares/auth.js'
import { hashPassword } from '../utils/password.js'

/**
 * 获取用户列表（管理员）
 */
export async function getUsers(_req: Request, res: Response) {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      nickname: true,
      avatar: true,
      bio: true,
      isAdmin: true,
      isBanned: true,
      departmentId: true,
      department: {
        select: { id: true, name: true }
      },
      createdAt: true
    },
    orderBy: { createdAt: 'desc' }
  })

  // 添加 isDepartmentAdmin 字段
  const departmentAdmins = await prisma.department.findMany({
    select: { adminId: true }
  })
  const adminIds = new Set(departmentAdmins.map(d => d.adminId))

  res.json({
    success: true,
    data: users.map(user => ({
      ...user,
      isDepartmentAdmin: adminIds.has(user.id)
    }))
  })
}

/**
 * 管理员创建用户
 */
export async function createUser(req: Request, res: Response) {
  const { email, password, nickname, departmentId } = req.body

  if (!email || !password) {
    throw new ApiError(400, '邮箱和密码不能为空')
  }

  if (password.length < 6) {
    throw new ApiError(400, '密码长度至少6位')
  }

  // 检查邮箱是否已注册
  const existingUser = await prisma.user.findUnique({ where: { email } })
  if (existingUser) {
    throw new ApiError(400, '该邮箱已被注册')
  }

  // 如果指定了部门，检查部门是否存在
  if (departmentId) {
    const dept = await prisma.department.findUnique({ where: { id: departmentId } })
    if (!dept) {
      throw new ApiError(400, '指定的部门不存在')
    }
  }

  const hashed = await hashPassword(password)

  const user = await prisma.user.create({
    data: {
      email,
      password: hashed,
      nickname: nickname || null,
      departmentId: departmentId || null
    },
    select: {
      id: true,
      email: true,
      nickname: true,
      avatar: true,
      bio: true,
      isAdmin: true,
      isBanned: true,
      departmentId: true,
      department: { select: { id: true, name: true } },
      createdAt: true
    }
  })

  res.status(201).json({
    success: true,
    data: { ...user, isDepartmentAdmin: false }
  })
}

/**
 * 获取用户详情
 */
export async function getUserById(req: Request, res: Response) {
  const { id } = req.params
  const currentUserId = (req as AuthRequest).userId

  // 只能查看自己的信息，或者是管理员
  const currentUser = await prisma.user.findUnique({
    where: { id: currentUserId },
    select: { isAdmin: true }
  })

  if (id !== currentUserId && !currentUser?.isAdmin) {
    throw new ApiError(403, '无权查看其他用户信息')
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      nickname: true,
      avatar: true,
      bio: true,
      isAdmin: true,
      isBanned: true,
      departmentId: true,
      department: {
        select: { id: true, name: true }
      },
      createdAt: true,
      updatedAt: true
    }
  })

  if (!user) {
    throw new ApiError(404, '用户不存在')
  }

  // 检查是否为部门管理员
  const managedDepartment = await prisma.department.findUnique({
    where: { adminId: id },
    select: { id: true, name: true }
  })

  res.json({
    success: true,
    data: {
      ...user,
      isDepartmentAdmin: !!managedDepartment,
      managedDepartment
    }
  })
}

/**
 * 更新用户信息
 */
export async function updateUser(req: Request, res: Response) {
  const { id } = req.params
  const currentUserId = (req as AuthRequest).userId
  const { nickname, bio, avatar, email } = req.body

  // 只能更新自己的信息
  if (id !== currentUserId) {
    throw new ApiError(403, '无权修改其他用户信息')
  }

  // 如果修改邮箱，检查唯一性
  if (email) {
    const existing = await prisma.user.findFirst({
      where: { email, NOT: { id } }
    })
    if (existing) {
      throw new ApiError(400, '该邮箱已被其他用户使用')
    }
  }

  const user = await prisma.user.update({
    where: { id },
    data: {
      ...(nickname !== undefined && { nickname }),
      ...(bio !== undefined && { bio }),
      ...(avatar !== undefined && { avatar }),
      ...(email !== undefined && { email })
    },
    select: {
      id: true,
      email: true,
      nickname: true,
      avatar: true,
      bio: true,
      isAdmin: true,
      isBanned: true,
      departmentId: true,
      department: {
        select: { id: true, name: true }
      },
      createdAt: true,
      updatedAt: true
    }
  })

  // 检查是否为部门管理员
  const managedDepartment = await prisma.department.findUnique({
    where: { adminId: id },
    select: { id: true, name: true }
  })

  res.json({
    success: true,
    data: {
      ...user,
      isDepartmentAdmin: !!managedDepartment,
      managedDepartment
    }
  })
}

/**
 * 删除用户（管理员）
 */
export async function deleteUser(req: Request, res: Response) {
  const { id } = req.params
  const currentUserId = (req as AuthRequest).userId

  // 不能删除自己
  if (id === currentUserId) {
    throw new ApiError(400, '不能删除自己的账号')
  }

  // 检查用户是否存在
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      isAdmin: true,
      nickname: true,
      email: true,
      department: { select: { adminId: true } }
    }
  })

  if (!user) {
    throw new ApiError(404, '用户不存在')
  }

  // 不能删除其他管理员
  if (user.isAdmin) {
    throw new ApiError(403, '不能删除系统管理员')
  }

  // 不能删除部门管理员（需要先移除其部门管理员身份）
  if (user.department?.adminId === id) {
    throw new ApiError(400, '该用户是部门管理员，请先在部门管理中移除其管理员身份或删除部门')
  }

  // 删除用户相关的数据
  await prisma.$transaction(async (tx) => {
    // 删除安全答案
    await tx.securityAnswer.deleteMany({
      where: { userId: id }
    })

    // 删除通知
    await tx.notification.deleteMany({
      where: { userId: id }
    })

    // 删除项目成员关系
    await tx.projectMember.deleteMany({
      where: { userId: id }
    })

    // 将用户创建的任务的创建者设为当前用户（管理员）
    await tx.task.updateMany({
      where: { creatorId: id },
      data: { creatorId: currentUserId }
    })

    // 将分配给该用户的任务重新分配给当前用户（管理员）
    await tx.task.updateMany({
      where: { assigneeId: id },
      data: { assigneeId: currentUserId }
    })

    // 删除用户
    await tx.user.delete({
      where: { id }
    })
  })

  res.json({
    success: true,
    message: `用户「${user.nickname || user.email}」已删除`
  })
}

/**
 * 切换用户状态（启用/禁用）
 */
export async function toggleUserStatus(req: Request, res: Response) {
  const { id } = req.params
  const currentUserId = (req as AuthRequest).userId

  // 不能操作自己
  if (id === currentUserId) {
    throw new ApiError(400, '不能禁用自己的账号')
  }

  // 检查用户是否存在
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, isAdmin: true, isBanned: true, nickname: true, email: true }
  })

  if (!user) {
    throw new ApiError(404, '用户不存在')
  }

  // 不能操作其他管理员
  if (user.isAdmin) {
    throw new ApiError(403, '不能禁用系统管理员')
  }

  // 切换状态
  const updated = await prisma.user.update({
    where: { id },
    data: { isBanned: !user.isBanned },
    select: {
      id: true,
      email: true,
      nickname: true,
      isBanned: true
    }
  })

  res.json({
    success: true,
    data: updated,
    message: `用户「${updated.nickname || updated.email}」已${updated.isBanned ? '禁用' : '启用'}`
  })
}

/**
 * 搜索用户（用于跨部门邀请）
 * 只返回基本信息：id, nickname, department
 */
export async function searchUsers(req: Request, res: Response) {
  const userId = (req as AuthRequest).userId
  const { keyword, projectId } = req.query

  if (!keyword || typeof keyword !== 'string' || keyword.length < 2) {
    throw new ApiError(400, '搜索关键词至少2个字符')
  }

  // 获取当前用户信息
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true, departmentId: true }
  })

  // 构建搜索条件
  const whereClause: {
    isBanned: boolean
    OR: Array<{ nickname: { contains: string } } | { email: { contains: string } }>
    departmentId?: { not: string }
    projectMembers?: { none: { projectId: string } }
  } = {
    isBanned: false,
    OR: [
      { nickname: { contains: keyword } },
      { email: { contains: keyword } }
    ]
  }

  // 如果不是系统管理员，排除自己部门的人（他们可以直接看到）
  if (!currentUser?.isAdmin && currentUser?.departmentId) {
    whereClause.departmentId = { not: currentUser.departmentId }
  }

  // 如果指定了项目ID，排除已经是项目成员的人
  if (projectId && typeof projectId === 'string') {
    whereClause.projectMembers = { none: { projectId } }
  }

  const users = await prisma.user.findMany({
    where: whereClause,
    select: {
      id: true,
      nickname: true,
      email: true,
      avatar: true,
      department: {
        select: { id: true, name: true }
      }
    },
    take: 20
  })

  res.json({
    success: true,
    data: users
  })
}

/**
 * 转让管理员权限
 */
export async function transferAdmin(req: Request, res: Response) {
  const { id } = req.params
  const currentUserId = (req as AuthRequest).userId

  // 检查当前用户是否是管理员
  const currentUser = await prisma.user.findUnique({
    where: { id: currentUserId },
    select: { isAdmin: true }
  })

  if (!currentUser?.isAdmin) {
    throw new ApiError(403, '只有管理员可以转让权限')
  }

  // 不能转让给自己
  if (id === currentUserId) {
    throw new ApiError(400, '不能转让给自己')
  }

  // 检查目标用户是否存在
  const targetUser = await prisma.user.findUnique({
    where: { id },
    select: { id: true, isAdmin: true, isBanned: true, nickname: true, email: true }
  })

  if (!targetUser) {
    throw new ApiError(404, '目标用户不存在')
  }

  if (targetUser.isBanned) {
    throw new ApiError(400, '不能将管理员权限转让给被禁用的用户')
  }

  if (targetUser.isAdmin) {
    throw new ApiError(400, '该用户已经是管理员')
  }

  // 执行转让
  await prisma.$transaction(async (tx) => {
    // 将当前用户设为普通用户
    await tx.user.update({
      where: { id: currentUserId },
      data: { isAdmin: false }
    })

    // 将目标用户设为管理员
    await tx.user.update({
      where: { id },
      data: { isAdmin: true }
    })
  })

  res.json({
    success: true,
    message: `已将管理员权限转让给「${targetUser.nickname || targetUser.email}」`
  })
}

/**
 * 获取部门成员列表（部门管理员或部门成员均可访问）
 */
export async function getDepartmentMembers(req: Request, res: Response) {
  const currentUserId = (req as AuthRequest).userId

  // 先尝试以部门管理员身份查找
  let department = await prisma.department.findUnique({
    where: { adminId: currentUserId },
    select: { id: true, name: true }
  })

  // 若非管理员，尝试以普通成员身份查找其所属部门
  if (!department) {
    const user = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: { departmentId: true }
    })
    if (user?.departmentId) {
      department = await prisma.department.findUnique({
        where: { id: user.departmentId },
        select: { id: true, name: true }
      })
    }
  }

  if (!department) {
    throw new ApiError(403, '您不属于任何部门')
  }

  // 获取部门管理员 ID 用于标记
  const deptAdmin = await prisma.department.findUnique({
    where: { id: department.id },
    select: { adminId: true }
  })

  // 获取部门成员
  const members = await prisma.user.findMany({
    where: { departmentId: department.id },
    select: {
      id: true,
      email: true,
      nickname: true,
      avatar: true,
      bio: true,
      isBanned: true,
      createdAt: true
    },
    orderBy: { createdAt: 'desc' }
  })

  res.json({
    success: true,
    data: {
      department,
      members: members.map(m => ({
        ...m,
        isDepartmentAdmin: m.id === (deptAdmin?.adminId ?? '')
      }))
    }
  })
}

/**
 * 转让部门管理员权限
 */
export async function transferDepartmentAdmin(req: Request, res: Response) {
  const { id } = req.params
  const currentUserId = (req as AuthRequest).userId

  // 获取当前用户管理的部门
  const department = await prisma.department.findUnique({
    where: { adminId: currentUserId },
    select: { id: true, name: true }
  })

  if (!department) {
    throw new ApiError(403, '您不是部门管理员')
  }

  // 不能转让给自己
  if (id === currentUserId) {
    throw new ApiError(400, '不能转让给自己')
  }

  // 检查目标用户是否存在且在同一部门
  const targetUser = await prisma.user.findUnique({
    where: { id },
    select: { id: true, nickname: true, email: true, isBanned: true, departmentId: true }
  })

  if (!targetUser) {
    throw new ApiError(404, '目标用户不存在')
  }

  if (targetUser.departmentId !== department.id) {
    throw new ApiError(400, '只能转让给本部门成员')
  }

  if (targetUser.isBanned) {
    throw new ApiError(400, '不能将管理员权限转让给被禁用的用户')
  }

  // 执行转让
  await prisma.department.update({
    where: { id: department.id },
    data: { adminId: id }
  })

  res.json({
    success: true,
    message: `已将「${department.name}」的管理员权限转让给「${targetUser.nickname || targetUser.email}」`
  })
}

/**
 * 部门管理员移除部门成员
 */
export async function removeDepartmentMember(req: Request, res: Response) {
  const { id } = req.params
  const currentUserId = (req as AuthRequest).userId

  // 获取当前用户管理的部门
  const department = await prisma.department.findUnique({
    where: { adminId: currentUserId },
    select: { id: true, name: true }
  })

  if (!department) {
    throw new ApiError(403, '您不是部门管理员')
  }

  // 不能移除自己（部门管理员）
  if (id === currentUserId) {
    throw new ApiError(400, '不能移除自己，如需转让请使用转让管理员功能')
  }

  // 检查目标用户
  const targetUser = await prisma.user.findUnique({
    where: { id },
    select: { id: true, nickname: true, email: true, departmentId: true }
  })

  if (!targetUser) {
    throw new ApiError(404, '用户不存在')
  }

  if (targetUser.departmentId !== department.id) {
    throw new ApiError(400, '该用户不在您的部门中')
  }

  // 将用户从部门移除（设置 departmentId 为 null）
  await prisma.user.update({
    where: { id },
    data: { departmentId: null }
  })

  res.json({
    success: true,
    message: `已将「${targetUser.nickname || targetUser.email}」从部门移除`
  })
}

/**
 * 部门管理员禁用/启用本部门成员
 */
export async function toggleDepartmentMemberStatus(req: Request, res: Response) {
  const { id } = req.params
  const currentUserId = (req as AuthRequest).userId

  // 获取当前用户管理的部门
  const department = await prisma.department.findUnique({
    where: { adminId: currentUserId },
    select: { id: true }
  })

  if (!department) {
    throw new ApiError(403, '您不是部门管理员')
  }

  // 不能操作自己
  if (id === currentUserId) {
    throw new ApiError(400, '不能操作自己的账号')
  }

  // 检查目标用户
  const targetUser = await prisma.user.findUnique({
    where: { id },
    select: { id: true, nickname: true, email: true, isBanned: true, departmentId: true, isAdmin: true }
  })

  if (!targetUser) {
    throw new ApiError(404, '用户不存在')
  }

  // 不能操作系统管理员
  if (targetUser.isAdmin) {
    throw new ApiError(403, '不能操作系统管理员')
  }

  if (targetUser.departmentId !== department.id) {
    throw new ApiError(400, '该用户不在您的部门中')
  }

  // 切换状态
  const updated = await prisma.user.update({
    where: { id },
    data: { isBanned: !targetUser.isBanned },
    select: {
      id: true,
      email: true,
      nickname: true,
      isBanned: true
    }
  })

  res.json({
    success: true,
    data: updated,
    message: `用户「${updated.nickname || updated.email}」已${updated.isBanned ? '禁用' : '启用'}`
  })
}
