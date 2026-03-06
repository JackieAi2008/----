/**
 * 中集智历 - 项目控制器
 */
import { Request, Response } from 'express'
import prisma from '../config/database.js'
import { ApiError } from '../middlewares/errorHandler.js'

/**
 * 获取当前用户的项目列表
 */
export async function getProjects(req: Request, res: Response) {
  const userId = (req as { userId?: string }).userId

  const projects = await prisma.project.findMany({
    where: {
      deletedAt: null,
      OR: [
        { ownerId: userId },
        { members: { some: { userId } } }
      ]
    },
    include: {
      owner: {
        select: { id: true, nickname: true, avatar: true }
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
  const userId = (req as { userId?: string }).userId

  const project = await prisma.project.findFirst({
    where: { id, deletedAt: null },
    include: {
      owner: {
        select: { id: true, nickname: true, avatar: true }
      },
      members: {
        include: {
          user: {
            select: { id: true, nickname: true, avatar: true }
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
  if (project.visibility === 'PRIVATE' && !isMember && !isOwner) {
    throw new ApiError(403, '无权访问该项目')
  }

  res.json({
    success: true,
    data: project
  })
}

/**
 * 创建项目
 */
export async function createProject(req: Request, res: Response) {
  const userId = (req as { userId?: string }).userId
  const { name, description, visibility } = req.body

  // 创建项目
  const project = await prisma.project.create({
    data: {
      name,
      description,
      visibility,
      ownerId: userId!,
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
 */
export async function updateProject(req: Request, res: Response) {
  const { id } = req.params
  const userId = (req as { userId?: string }).userId
  const { name, description, cover, visibility } = req.body

  // 检查权限
  const project = await prisma.project.findFirst({
    where: { id, deletedAt: null }
  })

  if (!project) {
    throw new ApiError(404, '项目不存在')
  }

  if (project.ownerId !== userId) {
    throw new ApiError(403, '只有项目负责人可以修改项目')
  }

  const updatedProject = await prisma.project.update({
    where: { id },
    data: { name, description, cover, visibility },
    include: {
      owner: {
        select: { id: true, nickname: true, avatar: true }
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
 */
export async function deleteProject(req: Request, res: Response) {
  const { id } = req.params
  const userId = (req as { userId?: string }).userId

  const project = await prisma.project.findFirst({
    where: { id, deletedAt: null }
  })

  if (!project) {
    throw new ApiError(404, '项目不存在')
  }

  if (project.ownerId !== userId) {
    throw new ApiError(403, '只有项目负责人可以删除项目')
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
        select: { id: true, nickname: true, avatar: true, email: true }
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
 */
export async function addMember(req: Request, res: Response) {
  const { id } = req.params
  const { userId: newMemberId } = req.body
  const currentUserId = (req as { userId?: string }).userId

  // 检查是否是项目负责人
  const project = await prisma.project.findFirst({
    where: { id, deletedAt: null }
  })

  if (!project) {
    throw new ApiError(404, '项目不存在')
  }

  if (project.ownerId !== currentUserId) {
    throw new ApiError(403, '只有项目负责人可以添加成员')
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
        select: { id: true, nickname: true, avatar: true }
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
  const currentUserId = (req as { userId?: string }).userId

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

  // 只有负责人可以移除成员，或者成员自己退出
  if (project.ownerId !== currentUserId && memberUserId !== currentUserId) {
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
 */
export async function inviteUser(req: Request, res: Response) {
  const { id } = req.params
  const { inviteeId } = req.body
  const inviterId = (req as { userId?: string }).userId

  // 检查项目
  const project = await prisma.project.findFirst({
    where: { id, deletedAt: null }
  })

  if (!project) {
    throw new ApiError(404, '项目不存在')
  }

  // 检查是否是项目成员
  const isMember = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: { projectId: id, userId: inviterId! }
    }
  })

  if (!isMember) {
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
  const userId = (req as { userId?: string }).userId

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
  const userId = (req as { userId?: string }).userId

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
  const userId = (req as { userId?: string }).userId

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
  const userId = (req as { userId?: string }).userId

  const project = await prisma.project.findFirst({
    where: { id }
  })

  if (!project) {
    throw new ApiError(404, '项目不存在')
  }

  if (project.ownerId !== userId) {
    throw new ApiError(403, '只有项目负责人可以恢复项目')
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
  const userId = (req as { userId?: string }).userId

  const project = await prisma.project.findFirst({
    where: { id }
  })

  if (!project) {
    throw new ApiError(404, '项目不存在')
  }

  if (project.ownerId !== userId) {
    throw new ApiError(403, '只有项目负责人可以永久删除项目')
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
  const currentUserId = (req as { userId?: string }).userId

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
