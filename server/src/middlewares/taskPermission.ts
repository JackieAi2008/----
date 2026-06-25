/**
 * 中集智历 - 任务权限中间件
 *
 * 权限规则：
 * - 编辑任务：项目负责人、任务创建者或任务负责人
 * - 删除任务：项目负责人、任务创建者或任务负责人
 * - 修改负责人：项目负责人、任务创建者或任务负责人
 * - 修改截止时间：项目负责人、任务创建者或任务负责人
 * - 更新状态：项目负责人、任务创建者、任务负责人或协作者
 */
import { Request, Response, NextFunction } from 'express'
import prisma from '../config/database.js'
import { ApiError } from './errorHandler.js'

// 任务操作类型
export enum TaskAction {
  VIEW = 'view',
  EDIT = 'edit',
  DELETE = 'delete',
  UPDATE_STATUS = 'update_status',
  CHANGE_ASSIGNEE = 'change_assignee',
  CHANGE_DUE_DATE = 'change_due_date',
  ADD_COLLABORATOR = 'add_collaborator',
  REMOVE_COLLABORATOR = 'remove_collaborator',
  ADD_COMMENT = 'add_comment',
  EVALUATE = 'evaluate',
}

// 扩展请求类型
export interface TaskPermissionRequest extends Request {
  userId?: string
  taskPermission?: {
    canEdit: boolean
    canDelete: boolean
    canChangeStatus: boolean
    canChangeAssignee: boolean
    canChangeDueDate: boolean
    canAddCollaborator: boolean
    canRemoveCollaborator: boolean
    canComment: boolean
  }
}

/**
 * 检查用户对任务的权限
 */
async function checkTaskPermission(
  userId: string,
  taskId: string
): Promise<{
  isProjectOwner: boolean
  isCreator: boolean
  isAssignee: boolean
  isCollaborator: boolean
  isProjectMember: boolean
  task: {
    id: string
    projectId: string
    creatorId: string
    assigneeId: string | null
  } | null
}> {
  // 获取任务信息
  const task = await prisma.task.findFirst({
    where: { id: taskId, deletedAt: null },
    select: {
      id: true,
      projectId: true,
      creatorId: true,
      assigneeId: true
    }
  })

  if (!task) {
    return {
      isProjectOwner: false,
      isCreator: false,
      isAssignee: false,
      isCollaborator: false,
      isProjectMember: false,
      task: null
    }
  }

  // 检查是否是项目成员并获取项目信息
  const projectMember = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: { projectId: task.projectId, userId }
    },
    include: {
      project: {
        select: { ownerId: true }
      }
    }
  })

  const isProjectOwner = projectMember?.project.ownerId === userId
  const isCreator = task.creatorId === userId
  const isAssignee = task.assigneeId === userId

  // 检查是否是协作者
  const collaborator = await prisma.taskCollaborator.findUnique({
    where: {
      taskId_userId: { taskId, userId }
    }
  })
  const isCollaborator = !!collaborator
  const isProjectMember = !!projectMember

  return {
    isProjectOwner,
    isCreator,
    isAssignee,
    isCollaborator,
    isProjectMember,
    task
  }
}

/**
 * 获取用户对任务的权限信息
 */
export async function getTaskPermissions(
  userId: string,
  taskId: string
): Promise<{
  canEdit: boolean
  canDelete: boolean
  canChangeStatus: boolean
  canChangeAssignee: boolean
  canChangeDueDate: boolean
  canAddCollaborator: boolean
  canRemoveCollaborator: boolean
  canComment: boolean
}> {
  const { isProjectOwner, isCreator, isAssignee, isCollaborator, isProjectMember, task } =
    await checkTaskPermission(userId, taskId)

  // 如果任务不存在或用户不是项目成员，没有任何权限
  if (!task || !isProjectMember) {
    return {
      canEdit: false,
      canDelete: false,
      canChangeStatus: false,
      canChangeAssignee: false,
      canChangeDueDate: false,
      canAddCollaborator: false,
      canRemoveCollaborator: false,
      canComment: false
    }
  }

  // 编辑：项目成员均可编辑（协作场景）；删除：项目负责人、任务创建者或任务负责人
  const canEdit = isProjectMember
  const canDelete = isProjectOwner || isCreator || isAssignee

  // 修改负责人和截止时间：项目负责人、任务创建者或任务负责人
  const canChangeAssignee = isProjectOwner || isCreator || isAssignee
  const canChangeDueDate = isProjectOwner || isCreator || isAssignee

  // 更新状态：项目负责人、任务创建者、任务负责人或协作者
  const canChangeStatus = isProjectOwner || isCreator || isAssignee || isCollaborator

  // 添加/移除协作者：项目负责人或任务创建者
  const canAddCollaborator = isProjectOwner || isCreator
  const canRemoveCollaborator = isProjectOwner || isCreator

  // 评论：所有项目成员
  const canComment = isProjectMember

  return {
    canEdit,
    canDelete,
    canChangeStatus,
    canChangeAssignee,
    canChangeDueDate,
    canAddCollaborator,
    canRemoveCollaborator,
    canComment
  }
}

/**
 * 任务权限检查中间件工厂
 */
export function requireTaskPermission(action: TaskAction) {
  return async (req: TaskPermissionRequest, _res: Response, next: NextFunction) => {
    const userId = req.userId
    const taskId = req.params.id || req.params.taskId

    if (!userId || !taskId) {
      throw new ApiError(401, '未授权')
    }

    const { isProjectOwner, isCreator, isAssignee, isCollaborator, isProjectMember, task } =
      await checkTaskPermission(userId, taskId)

    if (!task) {
      throw new ApiError(404, '任务不存在')
    }

    if (!isProjectMember) {
      throw new ApiError(403, '无权访问该任务')
    }

    let hasPermission = false

    switch (action) {
      case TaskAction.VIEW:
        hasPermission = isProjectMember
        break

      case TaskAction.EDIT:
        // 项目成员均可编辑任务内容（协作场景，与"项目成员可创建任务"保持一致）
        hasPermission = isProjectMember
        break
      case TaskAction.DELETE:
      case TaskAction.CHANGE_ASSIGNEE:
      case TaskAction.CHANGE_DUE_DATE:
        // 项目负责人、任务创建者或任务负责人
        hasPermission = isProjectOwner || isCreator || isAssignee
        break

      case TaskAction.ADD_COLLABORATOR:
      case TaskAction.REMOVE_COLLABORATOR:
        // 项目负责人或任务创建者
        hasPermission = isProjectOwner || isCreator
        break

      case TaskAction.UPDATE_STATUS:
        // 项目负责人、任务创建者、任务负责人或协作者
        hasPermission = isProjectOwner || isCreator || isAssignee || isCollaborator
        break

      case TaskAction.ADD_COMMENT:
        // 所有项目成员
        hasPermission = isProjectMember
        break

      default:
        hasPermission = false
    }

    if (!hasPermission) {
      throw new ApiError(403, '无权执行该操作')
    }

    // 将权限信息附加到请求对象
    req.taskPermission = await getTaskPermissions(userId, taskId)

    next()
  }
}

/**
 * 为任务响应添加权限信息
 */
export async function addPermissionsToTask(
  userId: string,
  task: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const permissions = await getTaskPermissions(userId, task.id as string)
  return {
    ...task,
    permissions
  }
}
