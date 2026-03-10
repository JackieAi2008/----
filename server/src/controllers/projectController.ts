/**
 * 中集智历 - 项目控制器
 */
import { Request, Response } from 'express'
import prisma from '../config/database.js'
import { ApiError } from '../middlewares/errorHandler.js'
import { AuthRequest } from '../middlewares/auth.js'

/**
 * 获取当前用户的项目列表
 * - 系统管理员：可以看到所有项目
 * - 部门管理员/普通成员：本部门项目 + 被邀请的项目
 */
export async function getProjects(req: Request, res: Response) {
  const userId = (req as AuthRequest).userId

  // 获取当前用户信息
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true, departmentId: true }
  })

  let whereClause: object

  if (currentUser?.isAdmin) {
    // 系统管理员：所有未删除的项目
    whereClause = { deletedAt: null }
  } else {
    // 普通用户：本部门项目 + 被邀请的项目
    whereClause = {
      deletedAt: null,
      OR: [
        { departmentId: currentUser?.departmentId }, // 本部门项目
        { ownerId: userId }, // 自己创建的项目
        { members: { some: { userId } } } // 被邀请的项目
      ]
    }
  }

  const projects = await prisma.project.findMany({
    where: whereClause,
    include: {
      owner: {
        select: { id: true, nickname: true, avatar: true }
      },
      department: {
        select: { id: true, name: true }
      },
      _count: {
        select: { members: true, tasks: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  res.json({
    success: true,
    data: projects
  })
}

/**
 * 获取公开项目列表
 */
export async function getPublicProjects(_req: Request, res: Response) {
  const projects = await prisma.project.findMany({
    where: {
      visibility: 'PUBLIC',
      deletedAt: null
    },
    include: {
      owner: {
        select: { id: true, nickname: true, avatar: true }
      },
      department: {
        select: { id: true, name: true }
      },
      _count: {
        select: { members: true, tasks: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  res.json({
    success: true,
    data: projects
  })
}

/**
 * 获取项目详情
 */
export async function getProjectById(req: Request, res: Response) {
  const { id } = req.params
  const userId = (req as AuthRequest).userId

  // 获取当前用户信息
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true, departmentId: true }
  })

  const project = await prisma.project.findFirst({
    where: { id, deletedAt: null },
    include: {
      owner: {
        select: { id: true, nickname: true, avatar: true, departmentId: true, department: { select: { id: true, name: true } } }
      },
      department: {
        select: { id: true, name: true }
      },
      members: {
        include: {
          user: {
            select: { id: true, nickname: true, avatar: true, departmentId: true, department: { select: { id: true, name: true } } }
          }
        }
      }
    }
  })

  if (!project) {
    throw new ApiError(404, '项目不存在')
  }

  // 检查访问权限
  const isMember = project.members.some(m => m.userId === userId)
  const isOwner = project.ownerId === userId
  const isSameDepartment = currentUser?.departmentId && project.departmentId === currentUser.departmentId
  const canAccess = currentUser?.isAdmin || isMember || isOwner || isSameDepartment || project.visibility === 'PUBLIC'

  if (!canAccess) {
    throw new ApiError(403, '无权访问该项目')
  }

  res.json({
    success: true,
    data: project
  })
}

/**
 * 创建项目
 * - 自动设置 departmentId 为创建者的部门
 */
export async function createProject(req: Request, res: Response) {
  const userId = (req as AuthRequest).userId
  const { name, description, visibility } = req.body

  // 获取创建者的部门
  const creator = await prisma.user.findUnique({
    where: { id: userId },
    select: { departmentId: true }
  })

  // 创建项目
  const project = await prisma.project.create({
    data: {
      name,
      description,
      visibility,
      ownerId: userId!,
      departmentId: creator?.departmentId,
      members: {
        create: {
          userId: userId!,
          role: 'OWNER'
        }
      }
    },
    include: {
      owner: {
        select: { id: true, nickname: true, avatar: true }
      },
      department: {
        select: { id: true, name: true }
      }
    }
  })

  res.status(201).json({
    success: true,
    data: project
  })
}

/**
 * 更新项目
 * - 项目负责人、部门管理员、系统管理员可以修改
 */
export async function updateProject(req: Request, res: Response) {
  const { id } = req.params
  const userId = (req as AuthRequest).userId
  const { name, description, cover, visibility } = req.body

  // 获取项目
  const project = await prisma.project.findFirst({
    where: { id, deletedAt: null },
    include: { department: true }
  })

  if (!project) {
    throw new ApiError(404, '项目不存在')
  }

  // 检查权限
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true, departmentId: true }
  })

  const isOwner = project.ownerId === userId
  const isDeptAdmin = project.departmentId && await prisma.department.findFirst({
    where: { id: project.departmentId, adminId: userId }
  })

  if (!isOwner && !isDeptAdmin && !currentUser?.isAdmin) {
    throw new ApiError(403, '只有项目负责人或部门管理员可以修改项目')
  }

  const updatedProject = await prisma.project.update({
    where: { id },
    data: { name, description, cover, visibility },
    include: {
      owner: {
        select: { id: true, nickname: true, avatar: true }
      },
      department: {
        select: { id: true, name: true }
      }
    }
  })

  res.json({
    success: true,
    data: updatedProject
  })
}

/**
 * 删除项目（软删除）
 * - 项目负责人、部门管理员、系统管理员可以删除
 */
export async function deleteProject(req: Request, res: Response) {
  const { id } = req.params
  const userId = (req as AuthRequest).userId

  const project = await prisma.project.findFirst({
    where: { id, deletedAt: null }
  })

  if (!project) {
    throw new ApiError(404, '项目不存在')
  }

  // 检查权限
  const isOwner = project.ownerId === userId
  const isDeptAdmin = project.departmentId && await prisma.department.findFirst({
    where: { id: project.departmentId, adminId: userId }
  })
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true }
  })

  if (!isOwner && !isDeptAdmin && !currentUser?.isAdmin) {
    throw new ApiError(403, '只有项目负责人或部门管理员可以删除项目')
  }

  await prisma.project.update({
    where: { id },
    data: { deletedAt: new Date() }
  })

  res.json({
    success: true,
    message: '项目已删除'
  })
}

/**
 * 获取项目成员
 */
export async function getProjectMembers(req: Request, res: Response) {
  const { id } = req.params

  const members = await prisma.projectMember.findMany({
    where: { projectId: id },
    include: {
      user: {
        select: {
          id: true,
          nickname: true,
          avatar: true,
          email: true,
          departmentId: true,
          department: { select: { id: true, name: true } }
        }
      }
    }
  })

  res.json({
    success: true,
    data: members
  })
}

/**
 * 添加项目成员
 * - 支持跨部门邀请
 */
export async function addMember(req: Request, res: Response) {
  const { id } = req.params
  const { userId: newMemberId } = req.body
  const currentUserId = (req as AuthRequest).userId

  // 获取项目
  const project = await prisma.project.findFirst({
    where: { id, deletedAt: null }
  })

  if (!project) {
    throw new ApiError(404, '项目不存在')
  }

  // 获取当前用户信息
  const currentUser = await prisma.user.findUnique({
    where: { id: currentUserId },
    select: { isAdmin: true, departmentId: true }
  })

  // 检查是否是项目负责人或部门管理员
  const isOwner = project.ownerId === currentUserId
  const isDeptAdmin = project.departmentId && await prisma.department.findFirst({
    where: { id: project.departmentId, adminId: currentUserId }
  })

  if (!isOwner && !isDeptAdmin && !currentUser?.isAdmin) {
    throw new ApiError(403, '只有项目负责人或部门管理员可以添加成员')
  }

  // 检查用户是否已是成员
  const existingMember = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: { projectId: id, userId: newMemberId }
    }
  })

  if (existingMember) {
    throw new ApiError(400, '用户已是项目成员')
  }

  const member = await prisma.projectMember.create({
    data: {
      projectId: id,
      userId: newMemberId,
      role: 'MEMBER'
    },
    include: {
      user: {
        select: {
          id: true,
          nickname: true,
          avatar: true,
          department: { select: { id: true, name: true } }
        }
      }
    }
  })

  res.status(201).json({
    success: true,
    data: member
  })
}

/**
 * 移除项目成员
 */
export async function removeMember(req: Request, res: Response) {
  const { id, userId: memberUserId } = req.params
  const currentUserId = (req as AuthRequest).userId

  const project = await prisma.project.findFirst({
    where: { id, deletedAt: null }
  })

  if (!project) {
    throw new ApiError(404, '项目不存在')
  }

  // 负责人不能被移除
  if (memberUserId === project.ownerId) {
    throw new ApiError(400, '项目负责人不能被移除')
  }

  // 获取当前用户信息
  const currentUser = await prisma.user.findUnique({
    where: { id: currentUserId },
    select: { isAdmin: true }
  })

  // 检查是否是项目负责人或部门管理员
  const isOwner = project.ownerId === currentUserId
  const isDeptAdmin = project.departmentId && await prisma.department.findFirst({
    where: { id: project.departmentId, adminId: currentUserId }
  })

  // 只有负责人/部门管理员可以移除成员，或者成员自己退出
  if (!isOwner && !isDeptAdmin && !currentUser?.isAdmin && memberUserId !== currentUserId) {
    throw new ApiError(403, '无权移除该成员')
  }

  await prisma.projectMember.delete({
    where: {
      projectId_userId: { projectId: id, userId: memberUserId }
    }
  })

  res.json({
    success: true,
    message: '成员已移除'
  })
}

/**
 * 邀请用户加入项目
 * - 项目负责人和部门管理员可以跨部门邀请
 */
export async function inviteUser(req: Request, res: Response) {
  const { id } = req.params
  const { inviteeId } = req.body
  const inviterId = (req as AuthRequest).userId

  // 检查项目
  const project = await prisma.project.findFirst({
    where: { id, deletedAt: null }
  })

  if (!project) {
    throw new ApiError(404, '项目不存在')
  }

  // 获取邀请人信息
  const inviter = await prisma.user.findUnique({
    where: { id: inviterId },
    select: { isAdmin: true, departmentId: true }
  })

  // 检查是否是项目成员
  const isMember = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: { projectId: id, userId: inviterId! }
    }
  })

  // 部门管理员和项目负责人可以跨部门邀请
  const isOwner = project.ownerId === inviterId
  const isDeptAdmin = project.departmentId && await prisma.department.findFirst({
    where: { id: project.departmentId, adminId: inviterId }
  })

  if (!isMember && !isOwner && !isDeptAdmin && !inviter?.isAdmin) {
    throw new ApiError(403, '只有项目成员可以邀请其他人')
  }

  // 检查被邀请人是否已是成员
  const existingMember = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: { projectId: id, userId: inviteeId }
    }
  })

  if (existingMember) {
    throw new ApiError(400, '用户已是项目成员')
  }

  // 创建邀请
  await prisma.projectInvite.create({
    data: {
      projectId: id,
      inviterId: inviterId!,
      inviteeId,
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7天后过期
    }
  })

  // 创建通知
  await prisma.notification.create({
    data: {
      userId: inviteeId,
      type: 'PROJECT_INVITE',
      title: '项目邀请',
      content: `您被邀请加入项目「${project.name}」`,
      relatedType: 'PROJECT',
      relatedId: id
    }
  })

  res.status(201).json({
    success: true,
    message: '邀请已发送'
  })
}

/**
 * 接受项目邀请
 */
export async function acceptInvite(req: Request, res: Response) {
  const { id } = req.params
  const userId = (req as AuthRequest).userId

  const invite = await prisma.projectInvite.findFirst({
    where: {
      projectId: id,
      inviteeId: userId,
      status: 'PENDING'
    }
  })

  if (!invite) {
    throw new ApiError(404, '邀请不存在或已过期')
  }

  // 更新邀请状态
  await prisma.projectInvite.update({
    where: { id: invite.id },
    data: { status: 'APPROVED' }
  })

  // 添加成员
  await prisma.projectMember.create({
    data: {
      projectId: id,
      userId: userId!,
      role: 'MEMBER'
    }
  })

  res.json({
    success: true,
    message: '已加入项目'
  })
}

/**
 * 拒绝项目邀请
 */
export async function rejectInvite(req: Request, res: Response) {
  const { id } = req.params
  const userId = (req as AuthRequest).userId

  const invite = await prisma.projectInvite.findFirst({
    where: {
      projectId: id,
      inviteeId: userId,
      status: 'PENDING'
    }
  })

  if (!invite) {
    throw new ApiError(404, '邀请不存在或已过期')
  }

  await prisma.projectInvite.update({
    where: { id: invite.id },
    data: { status: 'REJECTED' }
  })

  res.json({
    success: true,
    message: '已拒绝邀请'
  })
}

/**
 * 获取已删除的项目列表
 */
export async function getDeletedProjects(req: Request, res: Response) {
  const userId = (req as AuthRequest).userId

  // 计算30天前的日期
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const projects = await prisma.project.findMany({
    where: {
      ownerId: userId,
      deletedAt: {
        not: null,
        gte: thirtyDaysAgo
      }
    },
    include: {
      _count: {
        select: { tasks: true }
      }
    },
    orderBy: { deletedAt: 'desc' }
  })

  // 计算剩余天数
  const now = new Date()
  const projectsWithDaysRemaining = projects.map(project => {
    const deletedAt = project.deletedAt!
    const daysSinceDeleted = Math.floor((now.getTime() - deletedAt.getTime()) / (1000 * 60 * 60 * 24))
    const daysRemaining = 30 - daysSinceDeleted

    return {
      id: project.id,
      name: project.name,
      description: project.description,
      deletedAt: project.deletedAt,
      daysRemaining: Math.max(0, daysRemaining),
      taskCount: project._count.tasks
    }
  })

  res.json({
    success: true,
    data: projectsWithDaysRemaining
  })
}

/**
 * 恢复已删除的项目
 */
export async function restoreProject(req: Request, res: Response) {
  const { id } = req.params
  const userId = (req as AuthRequest).userId

  const project = await prisma.project.findFirst({
    where: { id }
  })

  if (!project) {
    throw new ApiError(404, '项目不存在')
  }

  // 检查权限
  const isOwner = project.ownerId === userId
  const isDeptAdmin = project.departmentId && await prisma.department.findFirst({
    where: { id: project.departmentId, adminId: userId }
  })
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true }
  })

  if (!isOwner && !isDeptAdmin && !currentUser?.isAdmin) {
    throw new ApiError(403, '只有项目负责人或部门管理员可以恢复项目')
  }

  if (!project.deletedAt) {
    throw new ApiError(400, '项目未被删除')
  }

  // 检查是否在30天内
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  if (project.deletedAt < thirtyDaysAgo) {
    throw new ApiError(400, '项目已超过恢复期限（30天）')
  }

  const restoredProject = await prisma.project.update({
    where: { id },
    data: { deletedAt: null },
    include: {
      owner: {
        select: { id: true, nickname: true, avatar: true }
      },
      department: {
        select: { id: true, name: true }
      }
    }
  })

  res.json({
    success: true,
    data: restoredProject,
    message: '项目已恢复'
  })
}

/**
 * 永久删除项目
 */
export async function permanentDeleteProject(req: Request, res: Response) {
  const { id } = req.params
  const userId = (req as AuthRequest).userId

  const project = await prisma.project.findFirst({
    where: { id }
  })

  if (!project) {
    throw new ApiError(404, '项目不存在')
  }

  // 检查权限
  const isOwner = project.ownerId === userId
  const isDeptAdmin = project.departmentId && await prisma.department.findFirst({
    where: { id: project.departmentId, adminId: userId }
  })
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true }
  })

  if (!isOwner && !isDeptAdmin && !currentUser?.isAdmin) {
    throw new ApiError(403, '只有项目负责人或部门管理员可以永久删除项目')
  }

  if (!project.deletedAt) {
    throw new ApiError(400, '请先软删除项目')
  }

  // 永久删除项目（会级联删除相关数据）
  await prisma.project.delete({
    where: { id }
  })

  res.json({
    success: true,
    message: '项目已永久删除'
  })
}

/**
 * 移交项目负责人
 */
export async function transferProject(req: Request, res: Response) {
  const { id } = req.params
  const { newOwnerId } = req.body
  const currentUserId = (req as AuthRequest).userId

  // 检查项目是否存在
  const project = await prisma.project.findFirst({
    where: { id, deletedAt: null }
  })

  if (!project) {
    throw new ApiError(404, '项目不存在')
  }

  // 只有当前负责人可以移交
  if (project.ownerId !== currentUserId) {
    throw new ApiError(403, '只有项目负责人可以移交项目')
  }

  // 不能移交给自己
  if (newOwnerId === currentUserId) {
    throw new ApiError(400, '不能将项目移交给自己')
  }

  // 检查新负责人是否是项目成员
  const newOwnerMember = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: { projectId: id, userId: newOwnerId }
    }
  })

  if (!newOwnerMember) {
    throw new ApiError(400, '新负责人必须是项目成员')
  }

  // 使用事务更新项目和成员角色
  const result = await prisma.$transaction(async (tx) => {
    // 更新项目的 ownerId
    const updatedProject = await tx.project.update({
      where: { id },
      data: { ownerId: newOwnerId },
      include: {
        owner: {
          select: { id: true, nickname: true, avatar: true }
        },
        department: {
          select: { id: true, name: true }
        }
      }
    })

    // 将原负责人的角色改为成员
    await tx.projectMember.update({
      where: {
        projectId_userId: { projectId: id, userId: currentUserId! }
      },
      data: { role: 'MEMBER' }
    })

    // 将新负责人的角色改为负责人
    await tx.projectMember.update({
      where: {
        projectId_userId: { projectId: id, userId: newOwnerId }
      },
      data: { role: 'OWNER' }
    })

    return updatedProject
  })

  res.json({
    success: true,
    data: result,
    message: '项目移交成功'
  })
}
