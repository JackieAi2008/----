/**
 * 中集智历 - 任务模板控制器
 */
import { Request, Response } from 'express'
import prisma from '../config/database.js'
import { ApiError } from '../middlewares/errorHandler.js'

/**
 * 获取任务模板列表
 */
export async function getTemplates(req: Request, res: Response) {
  const userId = (req as { userId?: string }).userId
  const { categoryId } = req.query

  // 构建查询条件
  const where: Record<string, unknown> = {
    creatorId: userId
  }

  if (categoryId) {
    where.categoryId = categoryId
  }

  const templates = await prisma.taskTemplate.findMany({
    where,
    include: {
      category: {
        select: { id: true, name: true, color: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  res.json({
    success: true,
    data: templates
  })
}

/**
 * 获取任务模板详情
 */
export async function getTemplateById(req: Request, res: Response) {
  const { id } = req.params
  const userId = (req as { userId?: string }).userId

  const template = await prisma.taskTemplate.findFirst({
    where: { id, creatorId: userId },
    include: {
      category: {
        select: { id: true, name: true, color: true }
      }
    }
  })

  if (!template) {
    throw new ApiError(404, '模板不存在')
  }

  res.json({
    success: true,
    data: template
  })
}

/**
 * 创建任务模板
 */
export async function createTemplate(req: Request, res: Response) {
  const userId = (req as { userId?: string }).userId
  const {
    title,
    description,
    priority,
    categoryId,
    defaultAssignee
  } = req.body

  // 验证必填字段
  if (!title) {
    throw new ApiError(400, '模板标题不能为空')
  }

  // 创建模板
  const template = await prisma.taskTemplate.create({
    data: {
      title,
      description,
      priority: priority || 'MEDIUM',
      categoryId,
      defaultAssignee,
      creatorId: userId!
    },
    include: {
      category: {
        select: { id: true, name: true, color: true }
      }
    }
  })

  res.status(201).json({
    success: true,
    data: template
  })
}

/**
 * 从任务创建模板
 */
export async function createTemplateFromTask(req: Request, res: Response) {
  const { taskId } = req.params
  const userId = (req as { userId?: string }).userId

  // 获取任务详情
  const task = await prisma.task.findFirst({
    where: { id: taskId, deletedAt: null }
  })

  if (!task) {
    throw new ApiError(404, '任务不存在')
  }

  // 检查是否已存在同名模板
  const existingTemplate = await prisma.taskTemplate.findFirst({
    where: { title: task.title, creatorId: userId }
  })

  if (existingTemplate) {
    throw new ApiError(400, '已存在同名模板')
  }

  // 创建模板
  const template = await prisma.taskTemplate.create({
    data: {
      title: task.title,
      description: task.description,
      priority: task.priority,
      categoryId: task.categoryId,
      defaultAssignee: task.assigneeId,
      creatorId: userId!
    },
    include: {
      category: {
        select: { id: true, name: true, color: true }
      }
    }
  })

  res.status(201).json({
    success: true,
    data: template,
    message: '模板创建成功'
  })
}

/**
 * 更新任务模板
 */
export async function updateTemplate(req: Request, res: Response) {
  const { id } = req.params
  const userId = (req as { userId?: string }).userId
  const {
    title,
    description,
    priority,
    categoryId,
    defaultAssignee
  } = req.body

  // 检查模板是否存在
  const template = await prisma.taskTemplate.findFirst({
    where: { id, creatorId: userId }
  })

  if (!template) {
    throw new ApiError(404, '模板不存在')
  }

  // 更新模板
  const updatedTemplate = await prisma.taskTemplate.update({
    where: { id },
    data: {
      title,
      description,
      priority,
      categoryId,
      defaultAssignee
    },
    include: {
      category: {
        select: { id: true, name: true, color: true }
      }
    }
  })

  res.json({
    success: true,
    data: updatedTemplate
  })
}

/**
 * 删除任务模板
 */
export async function deleteTemplate(req: Request, res: Response) {
  const { id } = req.params
  const userId = (req as { userId?: string }).userId

  // 检查模板是否存在
  const template = await prisma.taskTemplate.findFirst({
    where: { id, creatorId: userId }
  })

  if (!template) {
    throw new ApiError(404, '模板不存在')
  }

  // 删除模板
  await prisma.taskTemplate.delete({
    where: { id }
  })

  res.json({
    success: true,
    message: '模板已删除'
  })
}
