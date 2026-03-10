/**
 * 中集智历 - 用户控制器
 */
import { Request, Response } from 'express'
import prisma from '../config/database.js'
import { ApiError } from '../middlewares/errorHandler.js'
import { AuthRequest } from '../middlewares/auth.js'

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
  const { nickname, bio, avatar } = req.body

  // 只能更新自己的信息
  if (id !== currentUserId) {
    throw new ApiError(403, '无权修改其他用户信息')
  }

  const user = await prisma.user.update({
    where: { id },
    data: { nickname, bio, avatar },
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
 * 搜索用户
 */
export async function searchUsers(req: Request, res: Response) {
  const { keyword, departmentId } = req.query
  const currentUserId = (req as AuthRequest).userId

  if (!keyword || typeof keyword !== 'string') {
    throw new ApiError(400, '请输入搜索关键词')
  }

  // 获取当前用户信息
  const currentUser = await prisma.user.findUnique({
    where: { id: currentUserId },
    select: { isAdmin: true, departmentId: true }
  })

  // 构建查询条件
  const where: {
    OR: Array<{ nickname: { contains: string } } | { email: { contains: string } }>
    isBanned: boolean
    departmentId?: string | null
  } = {
    OR: [
      { nickname: { contains: keyword } },
      { email: { contains: keyword } }
    ],
    isBanned: false
  }

  // 如果指定了部门筛选
  if (departmentId && typeof departmentId === 'string') {
    where.departmentId = departmentId
  }

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      nickname: true,
      avatar: true,
      email: true,
      department: {
        select: { id: true, name: true }
      }
    },
    take: 10
  })

  // 如果不是系统管理员且搜索的是其他部门成员，只返回基本信息
  const isCrossDepartment = currentUser?.departmentId && currentUser.departmentId !== departmentId

  res.json({
    success: true,
    data: users.map(user => {
      // 跨部门搜索只返回基本信息
      if (!currentUser?.isAdmin && isCrossDepartment) {
        return {
          id: user.id,
          nickname: user.nickname,
          department: user.department
        }
      }
      return user
    })
  })
}
