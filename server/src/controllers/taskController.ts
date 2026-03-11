/**
 * 中集智历 - 任务控制器
 */
import { Request, Response } from 'express'
import prisma from '../config/database.js'
import { ApiError } from '../middlewares/errorHandler.js'
import { getTaskPermissions } from '../middlewares/taskPermission.js'
import { createNextRecurringTask } from '../services/recurringTaskService.js'
import { AuthRequest } from '../middlewares/auth.js'

// 用户选择字段（包含部门信息）
const userSelectWithDept = {
  id: true,
  nickname: true,
  avatar: true,
  department: {
    select: { id: true, name: true }
  }
}

/**
 * 获取任务列表
 */
export async function getTasks(req: Request, res: Response) {
  const userId = (req as AuthRequest).userId
  const { projectId, assigneeId, status, startDate, endDate } = req.query

  // 获取当前用户信息
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true, departmentId: true }
  })

  // 构建查询条件
  const where: Record<string, unknown> = {
    deletedAt: null
  }

  if (projectId) {
    where.projectId = projectId
  }

  if (assigneeId) {
    where.assigneeId = assigneeId
  }

  if (status) {
    where.status = status
  }

  if (startDate || endDate) {
    where.dueDate = {}
    if (startDate) {
      (where.dueDate as Record<string, Date>).gte = new Date(startDate as string)
    }
    if (endDate) {
      (where.dueDate as Record<string, Date>).lte = new Date(endDate as string)
    }
  }

  // 如果没有指定项目，只返回用户有权限的任务
  if (!projectId) {
    if (currentUser?.isAdmin) {
      // 系统管理员可以看到所有任务
    } else {
      where.OR = [
        { assigneeId: userId },
        { collaborators: { some: { userId } } },
        { project: { members: { some: { userId } } } },
        { project: { departmentId: currentUser?.departmentId } }
      ]
    }
  }

  const tasks = await prisma.task.findMany({
    where,
    include: {
      project: {
        select: { id: true, name: true, departmentId: true, department: { select: { id: true, name: true } } }
      },
      category: true,
      assignee: {
        select: userSelectWithDept
      },
      creator: {
        select: { id: true, nickname: true }
      },
      collaborators: {
        include: {
          user: {
            select: userSelectWithDept
          }
        }
      }
    },
    orderBy: { dueDate: 'asc' }
  })

  res.json({
    success: true,
    data: tasks
  })
}

/**
 * 获取任务详情
 */
export async function getTaskById(req: Request, res: Response) {
  const { id } = req.params
  const userId = (req as AuthRequest).userId

  const task = await prisma.task.findFirst({
    where: { id, deletedAt: null },
    include: {
      project: {
        select: { id: true, name: true, ownerId: true, departmentId: true, department: { select: { id: true, name: true } } }
      },
      category: true,
      assignee: {
        select: userSelectWithDept
      },
      creator: {
        select: { id: true, nickname: true, department: { select: { id: true, name: true } } }
      },
      collaborators: {
        include: {
          user: {
            select: userSelectWithDept
          }
        }
      },
      comments: {
        where: { deletedAt: null },
        include: {
          user: {
            select: { id: true, nickname: true, avatar: true, department: { select: { id: true, name: true } } }
          }
        },
        orderBy: { createdAt: 'desc' }
      },
      attachments: {
        include: {
          uploader: {
            select: { id: true, nickname: true, department: { select: { id: true, name: true } } }
          }
        }
      }
    }
  })

  if (!task) {
    throw new ApiError(404, '任务不存在')
  }

  // 获取权限信息
  const permissions = userId ? await getTaskPermissions(userId, id) : null

  res.json({
    success: true,
    data: {
      ...task,
      permissions
    }
  })
}

/**
 * 创建任务
 */
export async function createTask(req: Request, res: Response) {
  const userId = (req as { userId?: string }).userId
  const {
    projectId,
    title,
    description,
    startDate,
    dueDate,
    categoryId,
    assigneeId,
    priority,
    visibility,  // 新增：任务可见性
    deliverable,
    tags,
    reminder,
    repeat,
    collaboratorIds
  } = req.body

  // 检查项目权限
  const member = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: { projectId, userId: userId! }
    }
  })

  if (!member) {
    throw new ApiError(403, '无权在该项目中创建任务')
  }

  // 创建任务
  const task = await prisma.task.create({
    data: {
      projectId,
      title,
      description,
      startDate: startDate ? new Date(startDate) : null,
      dueDate: new Date(dueDate),
      categoryId,
      assigneeId,
      priority: priority || 'MEDIUM',
      status: 'TODO',
      visibility: visibility || 'PRIVATE',  // 默认私密
      deliverable,
      tags: tags || [],
      reminder,
      repeat,
      creatorId: userId!,
      collaborators: collaboratorIds ? {
        create: (collaboratorIds as string[]).map(id => ({
          userId: id
        }))
      } : undefined
    },
    include: {
      project: {
        select: { id: true, name: true }
      },
      category: true,
      assignee: {
        select: { id: true, nickname: true, avatar: true }
      }
    }
  })

  // 发送通知给负责人
  if (assigneeId && assigneeId !== userId) {
    await prisma.notification.create({
      data: {
        userId: assigneeId,
        type: 'TASK_ASSIGNED',
        title: '新任务指派',
        content: `您被指派了新任务「${title}」`,
        relatedType: 'TASK',
        relatedId: task.id
      }
    })
  }

  // 发送通知给协作者
  if (collaboratorIds && collaboratorIds.length > 0) {
    const notifications = (collaboratorIds as string[])
      .filter(id => id !== userId && id !== assigneeId)
      .map(id => ({
        userId: id,
        type: 'TASK_COLLABORATOR',
        title: '协作任务邀请',
        content: `您被邀请协作任务「${title}」`,
        relatedType: 'TASK',
        relatedId: task.id
      }))

    if (notifications.length > 0) {
      await prisma.notification.createMany({ data: notifications })
    }
  }

  res.status(201).json({
    success: true,
    data: task
  })
}

/**
 * 更新任务
 */
export async function updateTask(req: Request, res: Response) {
  const { id } = req.params
  const userId = (req as { userId?: string }).userId
  const {
    title,
    description,
    startDate,
    dueDate,
    categoryId,
    assigneeId,
    priority,
    status,
    visibility,  // 新增：任务可见性
    deliverable,
    tags,
    reminder,
    repeat
  } = req.body

  // 检查任务是否存在
  const task = await prisma.task.findFirst({
    where: { id, deletedAt: null }
  })

  if (!task) {
    throw new ApiError(404, '任务不存在')
  }

  // 检查权限
  const member = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: { projectId: task.projectId, userId: userId! }
    }
  })

  if (!member) {
    throw new ApiError(403, '无权修改该任务')
  }

  const updatedTask = await prisma.task.update({
    where: { id },
    data: {
      title,
      description,
      startDate: startDate ? new Date(startDate) : null,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      categoryId,
      assigneeId,
      priority,
      status,
      visibility,  // 更新可见性
      deliverable,
      tags: tags || [],
      reminder,
      repeat
    },
    include: {
      project: {
        select: { id: true, name: true }
      },
      category: true,
      assignee: {
        select: { id: true, nickname: true, avatar: true }
      }
    }
  })

  // 如果任务状态变更为已完成，且是重复任务，则创建下一个重复任务
  if (status === 'DONE' && task.repeat && task.status !== 'DONE') {
    try {
      await createNextRecurringTask(id)
    } catch (error) {
      // 记录错误但不影响响应
      console.error('创建下一个重复任务失败:', error)
    }
  }

  res.json({
    success: true,
    data: updatedTask
  })
}

/**
 * 更新任务状态（负责人、协作者也可以更新）
 */
export async function updateTaskStatus(req: Request, res: Response) {
  const { id } = req.params
  const { status } = req.body

  // 检查任务是否存在
  const task = await prisma.task.findFirst({
    where: { id, deletedAt: null }
  })

  if (!task) {
    throw new ApiError(404, '任务不存在')
  }

  // 权限检查已在中间件中完成
  const updatedTask = await prisma.task.update({
    where: { id },
    data: { status },
    include: {
      project: {
        select: { id: true, name: true }
      },
      assignee: {
        select: { id: true, nickname: true, avatar: true }
      }
    }
  })

  // 如果任务状态变更为已完成，且是重复任务，则创建下一个重复任务
  if (status === 'DONE' && task.repeat) {
    try {
      await createNextRecurringTask(id)
    } catch (error) {
      // 记录错误但不影响响应
      console.error('创建下一个重复任务失败:', error)
    }
  }

  res.json({
    success: true,
    data: updatedTask
  })
}

/**
 * 删除任务（软删除）
 */
export async function deleteTask(req: Request, res: Response) {
  const { id } = req.params
  const userId = (req as { userId?: string }).userId

  const task = await prisma.task.findFirst({
    where: { id, deletedAt: null }
  })

  if (!task) {
    throw new ApiError(404, '任务不存在')
  }

  // 检查权限
  const member = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: { projectId: task.projectId, userId: userId! }
    }
  })

  if (!member) {
    throw new ApiError(403, '无权删除该任务')
  }

  await prisma.task.update({
    where: { id },
    data: { deletedAt: new Date() }
  })

  res.json({
    success: true,
    message: '任务已删除'
  })
}

/**
 * 获取任务类别列表
 */
export async function getTaskCategories(req: Request, res: Response) {
  const { projectId } = req.query

  const categories = await prisma.taskCategory.findMany({
    where: {
      OR: [
        { isSystem: true },
        { projectId: projectId as string }
      ]
    },
    orderBy: [
      { isSystem: 'desc' },
      { name: 'asc' }
    ]
  })

  res.json({
    success: true,
    data: categories
  })
}

/**
 * 创建任务类别
 */
export async function createTaskCategory(req: Request, res: Response) {
  const { projectId, name, color } = req.body

  const category = await prisma.taskCategory.create({
    data: {
      projectId,
      name,
      color,
      isSystem: false
    }
  })

  res.status(201).json({
    success: true,
    data: category
  })
}

/**
 * 添加任务协作者
 */
export async function addCollaborator(req: Request, res: Response) {
  const { id } = req.params
  const { userId: collaboratorId } = req.body
  const currentUserId = (req as { userId?: string }).userId

  // 检查任务
  const task = await prisma.task.findFirst({
    where: { id, deletedAt: null }
  })

  if (!task) {
    throw new ApiError(404, '任务不存在')
  }

  // 检查权限
  const member = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: { projectId: task.projectId, userId: currentUserId! }
    }
  })

  if (!member) {
    throw new ApiError(403, '无权操作')
  }

  // 检查是否已是协作者
  const existing = await prisma.taskCollaborator.findUnique({
    where: {
      taskId_userId: { taskId: id, userId: collaboratorId }
    }
  })

  if (existing) {
    throw new ApiError(400, '用户已是协作者')
  }

  await prisma.taskCollaborator.create({
    data: {
      taskId: id,
      userId: collaboratorId
    }
  })

  res.status(201).json({
    success: true,
    message: '协作者已添加'
  })
}

/**
 * 移除任务协作者
 */
export async function removeCollaborator(req: Request, res: Response) {
  const { id, userId: collaboratorId } = req.params
  const currentUserId = (req as { userId?: string }).userId

  const task = await prisma.task.findFirst({
    where: { id, deletedAt: null }
  })

  if (!task) {
    throw new ApiError(404, '任务不存在')
  }

  const member = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: { projectId: task.projectId, userId: currentUserId! }
    }
  })

  if (!member) {
    throw new ApiError(403, '无权操作')
  }

  await prisma.taskCollaborator.delete({
    where: {
      taskId_userId: { taskId: id, userId: collaboratorId }
    }
  })

  res.json({
    success: true,
    message: '协作者已移除'
  })
}

/**
 * 添加任务评论
 */
export async function addComment(req: Request, res: Response) {
  const { id } = req.params
  const userId = (req as { userId?: string }).userId
  const { content, mentions, replyToId, images } = req.body

  const task = await prisma.task.findFirst({
    where: { id, deletedAt: null }
  })

  if (!task) {
    throw new ApiError(404, '任务不存在')
  }

  const comment = await prisma.comment.create({
    data: {
      taskId: id,
      userId: userId!,
      content,
      mentions: mentions ? JSON.stringify(mentions) : null,
      replyToId,
      images: images ? JSON.stringify(images) : null
    },
    include: {
      user: {
        select: { id: true, nickname: true, avatar: true }
      }
    }
  })

  res.status(201).json({
    success: true,
    data: comment
  })
}

/**
 * 删除任务评论
 */
export async function deleteComment(req: Request, res: Response) {
  const { id, commentId } = req.params
  const userId = (req as { userId?: string }).userId

  const comment = await prisma.comment.findFirst({
    where: { id: commentId, taskId: id }
  })

  if (!comment) {
    throw new ApiError(404, '评论不存在')
  }

  // 只有评论作者可以删除
  if (comment.userId !== userId) {
    throw new ApiError(403, '无权删除该评论')
  }

  await prisma.comment.update({
    where: { id: commentId },
    data: { deletedAt: new Date() }
  })

  res.json({
    success: true,
    message: '评论已删除'
  })
}

/**
 * 归档已完成超过30天的任务
 */
export async function archiveCompletedTasks(req: Request, res: Response) {
  const userId = (req as { userId?: string }).userId

  // 计算30天前的日期
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  // 查找用户有权限的、已完成超过30天且未归档的任务
  const tasksToArchive = await prisma.task.findMany({
    where: {
      deletedAt: null,
      isArchived: false,
      status: 'DONE',
      updatedAt: { lt: thirtyDaysAgo },
      OR: [
        { assigneeId: userId },
        { collaborators: { some: { userId } } },
        { project: { members: { some: { userId } } } }
      ]
    },
    select: { id: true }
  })

  const taskIds = tasksToArchive.map(t => t.id)

  if (taskIds.length === 0) {
    res.json({
      success: true,
      message: '没有需要归档的任务',
      data: { count: 0 }
    })
    return
  }

  // 批量更新为已归档
  const result = await prisma.task.updateMany({
    where: { id: { in: taskIds } },
    data: {
      isArchived: true,
      archivedAt: new Date()
    }
  })

  res.json({
    success: true,
    message: `已归档 ${result.count} 个任务`,
    data: { count: result.count }
  })
}

/**
 * 获取已归档任务列表
 */
export async function getArchivedTasks(req: Request, res: Response) {
  const userId = (req as { userId?: string }).userId
  const { projectId } = req.query

  // 构建查询条件
  const where: Record<string, unknown> = {
    deletedAt: null,
    isArchived: true
  }

  if (projectId) {
    where.projectId = projectId
  }

  // 只返回用户有权限的归档任务
  if (!projectId) {
    where.OR = [
      { assigneeId: userId },
      { collaborators: { some: { userId } } },
      { project: { members: { some: { userId } } } }
    ]
  }

  const tasks = await prisma.task.findMany({
    where,
    include: {
      project: {
        select: { id: true, name: true }
      },
      category: true,
      assignee: {
        select: { id: true, nickname: true, avatar: true }
      },
      creator: {
        select: { id: true, nickname: true }
      }
    },
    orderBy: { archivedAt: 'desc' }
  })

  res.json({
    success: true,
    data: tasks
  })
}

/**
 * 恢复归档任务
 */
export async function unarchiveTask(req: Request, res: Response) {
  const { id } = req.params
  const userId = (req as { userId?: string }).userId

  // 检查任务是否存在
  const task = await prisma.task.findFirst({
    where: { id, deletedAt: null, isArchived: true }
  })

  if (!task) {
    throw new ApiError(404, '归档任务不存在')
  }

  // 检查权限
  const member = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: { projectId: task.projectId, userId: userId! }
    }
  })

  if (!member) {
    throw new ApiError(403, '无权恢复该任务')
  }

  const updatedTask = await prisma.task.update({
    where: { id },
    data: {
      isArchived: false,
      archivedAt: null
    },
    include: {
      project: {
        select: { id: true, name: true }
      },
      category: true,
      assignee: {
        select: { id: true, nickname: true, avatar: true }
      }
    }
  })

  res.json({
    success: true,
    message: '任务已恢复',
    data: updatedTask
  })
}

/**
 * 批量更新任务
 */
export async function batchUpdateTasks(req: Request, res: Response) {
  const userId = (req as { userId?: string }).userId
  const { taskIds, status, priority } = req.body

  if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
    throw new ApiError(400, '请选择要更新的任务')
  }

  // 构建更新数据
  const updateData: Record<string, unknown> = {}
  if (status) updateData.status = status
  if (priority) updateData.priority = priority

  if (Object.keys(updateData).length === 0) {
    throw new ApiError(400, '请指定要更新的字段')
  }

  // 验证用户对任务的权限
  const tasks = await prisma.task.findMany({
    where: {
      id: { in: taskIds },
      deletedAt: null
    },
    select: { id: true, projectId: true }
  })

  // 检查权限
  for (const task of tasks) {
    const member = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId: task.projectId, userId: userId! }
      }
    })
    if (!member) {
      throw new ApiError(403, `无权修改任务 ${task.id}`)
    }
  }

  // 批量更新
  const result = await prisma.task.updateMany({
    where: {
      id: { in: taskIds },
      deletedAt: null
    },
    data: updateData
  })

  res.json({
    success: true,
    message: `已更新 ${result.count} 个任务`,
    data: { count: result.count }
  })
}

/**
 * 批量删除任务
 */
export async function batchDeleteTasks(req: Request, res: Response) {
  const userId = (req as { userId?: string }).userId
  const { taskIds } = req.body

  if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
    throw new ApiError(400, '请选择要删除的任务')
  }

  // 验证用户对任务的权限
  const tasks = await prisma.task.findMany({
    where: {
      id: { in: taskIds },
      deletedAt: null
    },
    select: { id: true, projectId: true }
  })

  // 检查权限
  for (const task of tasks) {
    const member = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId: task.projectId, userId: userId! }
      }
    })
    if (!member) {
      throw new ApiError(403, `无权删除任务 ${task.id}`)
    }
  }

  // 批量软删除
  const result = await prisma.task.updateMany({
    where: {
      id: { in: taskIds },
      deletedAt: null
    },
    data: { deletedAt: new Date() }
  })

  res.json({
    success: true,
    message: `已删除 ${result.count} 个任务`,
    data: { count: result.count }
  })
}

/**
 * 批量归档任务
 */
export async function batchArchiveTasks(req: Request, res: Response) {
  const userId = (req as { userId?: string }).userId
  const { taskIds } = req.body

  if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
    throw new ApiError(400, '请选择要归档的任务')
  }

  // 验证用户对任务的权限
  const tasks = await prisma.task.findMany({
    where: {
      id: { in: taskIds },
      deletedAt: null
    },
    select: { id: true, projectId: true }
  })

  // 检查权限
  for (const task of tasks) {
    const member = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId: task.projectId, userId: userId! }
      }
    })
    if (!member) {
      throw new ApiError(403, `无权归档任务 ${task.id}`)
    }
  }

  // 批量归档
  const result = await prisma.task.updateMany({
    where: {
      id: { in: taskIds },
      deletedAt: null
    },
    data: {
      isArchived: true,
      archivedAt: new Date()
    }
  })

  res.json({
    success: true,
    message: `已归档 ${result.count} 个任务`,
    data: { count: result.count }
  })
}

/**
 * 获取所有标签
 */
export async function getAllTags(req: Request, res: Response) {
  const userId = (req as { userId?: string }).userId
  const { projectId } = req.query

  // 构建查询条件
  const where: Record<string, unknown> = {
    deletedAt: null,
    isArchived: false
  }

  if (projectId) {
    where.projectId = projectId
  } else {
    // 获取用户有权限的所有任务的标签
    where.OR = [
      { assigneeId: userId },
      { collaborators: { some: { userId } } },
      { project: { members: { some: { userId } } } }
    ]
  }

  const tasks = await prisma.task.findMany({
    where,
    select: { tags: true }
  })

  // 提取并去重所有标签
  const tagsSet = new Set<string>()
  tasks.forEach(task => {
    if (task.tags && Array.isArray(task.tags)) {
      task.tags.forEach(tag => tagsSet.add(tag))
    }
  })

  const tags = Array.from(tagsSet).sort()

  res.json({
    success: true,
    data: tags
  })
}

/**
 * 更新任务标签
 */
export async function updateTaskTags(req: Request, res: Response) {
  const { id } = req.params
  const userId = (req as { userId?: string }).userId
  const { tags } = req.body

  // 验证标签格式
  if (!Array.isArray(tags)) {
    throw new ApiError(400, '标签格式无效')
  }

  // 验证每个标签都是字符串
  if (!tags.every(tag => typeof tag === 'string')) {
    throw new ApiError(400, '标签必须为字符串')
  }

  // 检查任务是否存在
  const task = await prisma.task.findFirst({
    where: { id, deletedAt: null }
  })

  if (!task) {
    throw new ApiError(404, '任务不存在')
  }

  // 检查权限
  const member = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: { projectId: task.projectId, userId: userId! }
    }
  })

  if (!member) {
    throw new ApiError(403, '无权修改该任务')
  }

  const updatedTask = await prisma.task.update({
    where: { id },
    data: { tags: JSON.stringify(tags) },
    include: {
      project: {
        select: { id: true, name: true }
      },
      category: true,
      assignee: {
        select: { id: true, nickname: true, avatar: true }
      }
    }
  })

  res.json({
    success: true,
    data: updatedTask
  })
}
