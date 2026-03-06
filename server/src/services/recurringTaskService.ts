/**
 * 中集智历 - 重复任务服务
 * 处理重复任务的创建和管理
 */
import prisma from '../config/database.js'
import { logger } from '../utils/logger.js'

// 重复类型
export type RepeatType = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'

/**
 * 计算下一个重复日期
 * @param currentDate 当前日期
 * @param repeatType 重复类型
 * @returns 下一个重复日期
 */
export function calculateNextDueDate(currentDate: Date, repeatType: RepeatType): Date {
  const nextDate = new Date(currentDate)

  switch (repeatType) {
    case 'DAILY':
      nextDate.setDate(nextDate.getDate() + 1)
      break
    case 'WEEKLY':
      nextDate.setDate(nextDate.getDate() + 7)
      break
    case 'MONTHLY':
      // 保持相同的日期，只增加月份
      nextDate.setMonth(nextDate.getMonth() + 1)
      break
    case 'YEARLY':
      nextDate.setFullYear(nextDate.getFullYear() + 1)
      break
    default:
      throw new Error(`未知的重复类型: ${repeatType}`)
  }

  return nextDate
}

/**
 * 创建下一个重复任务
 * @param taskId 已完成的任务ID
 * @returns 新创建的任务或null
 */
export async function createNextRecurringTask(taskId: string): Promise<{
  id: string
  title: string
  dueDate: Date
} | null> {
  try {
    // 获取原任务信息
    const originalTask = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        collaborators: true
      }
    })

    if (!originalTask) {
      logger.warn(`任务不存在: ${taskId}`)
      return null
    }

    // 检查是否是重复任务
    if (!originalTask.repeat) {
      logger.debug(`任务不是重复任务: ${taskId}`)
      return null
    }

    // 检查任务状态是否为已完成
    if (originalTask.status !== 'DONE') {
      logger.debug(`任务未完成，不创建下一个重复任务: ${taskId}`)
      return null
    }

    const repeatType = originalTask.repeat as RepeatType
    const nextDueDate = calculateNextDueDate(originalTask.dueDate, repeatType)

    // 计算下一个开始日期（如果有）
    let nextStartDate: Date | null = null
    if (originalTask.startDate) {
      const startDateDiff = originalTask.dueDate.getTime() - originalTask.startDate.getTime()
      nextStartDate = new Date(nextDueDate.getTime() - startDateDiff)
    }

    // 创建新任务
    const newTask = await prisma.task.create({
      data: {
        projectId: originalTask.projectId,
        title: originalTask.title,
        description: originalTask.description,
        startDate: nextStartDate,
        dueDate: nextDueDate,
        categoryId: originalTask.categoryId,
        assigneeId: originalTask.assigneeId,
        priority: originalTask.priority,
        status: 'TODO', // 新任务状态为待办
        deliverable: originalTask.deliverable,
        tags: originalTask.tags,
        reminder: originalTask.reminder,
        repeat: originalTask.repeat, // 保持相同的重复设置
        creatorId: originalTask.creatorId,
        collaborators: originalTask.collaborators.length > 0 ? {
          create: originalTask.collaborators.map(collab => ({
            userId: collab.userId
          }))
        } : undefined
      },
      select: {
        id: true,
        title: true,
        dueDate: true
      }
    })

    logger.info(`已创建下一个重复任务: ${newTask.id}, 原任务: ${taskId}, 截止日期: ${nextDueDate.toISOString()}`)

    // 发送通知给负责人
    if (originalTask.assigneeId) {
      await prisma.notification.create({
        data: {
          userId: originalTask.assigneeId,
          type: 'TASK_RECURRING',
          title: '重复任务已生成',
          content: `您的重复任务「${originalTask.title}」已生成新的任务实例`,
          relatedType: 'TASK',
          relatedId: newTask.id
        }
      })
    }

    return newTask
  } catch (error) {
    logger.error(`创建下一个重复任务失败: ${taskId}`, error)
    throw error
  }
}

/**
 * 批量处理已完成的重复任务
 * 查找所有已完成但尚未创建下一个实例的重复任务
 */
export async function processCompletedRecurringTasks(): Promise<number> {
  try {
    // 查找所有已完成的重复任务
    // 这里我们检查最近完成的任务（例如最近7天内完成的）
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const completedRecurringTasks = await prisma.task.findMany({
      where: {
        status: 'DONE',
        repeat: { not: null },
        deletedAt: null,
        updatedAt: { gte: sevenDaysAgo }
      },
      select: { id: true }
    })

    let createdCount = 0

    for (const task of completedRecurringTasks) {
      // 检查是否已经为这个任务创建了下一个实例
      // 通过检查是否存在相同标题、项目、负责人且截止日期更晚的任务
      const originalTask = await prisma.task.findUnique({
        where: { id: task.id }
      })

      if (!originalTask) continue

      const nextDueDate = calculateNextDueDate(
        originalTask.dueDate,
        originalTask.repeat as RepeatType
      )

      // 检查是否已存在下一个实例
      const existingNextTask = await prisma.task.findFirst({
        where: {
          projectId: originalTask.projectId,
          title: originalTask.title,
          assigneeId: originalTask.assigneeId,
          dueDate: nextDueDate,
          deletedAt: null
        }
      })

      // 如果不存在下一个实例，则创建
      if (!existingNextTask) {
        await createNextRecurringTask(task.id)
        createdCount++
      }
    }

    if (createdCount > 0) {
      logger.info(`批量处理重复任务完成，创建了 ${createdCount} 个新任务`)
    }

    return createdCount
  } catch (error) {
    logger.error('批量处理重复任务失败', error)
    throw error
  }
}

/**
 * 获取任务的所有重复实例
 * @param taskId 任务ID
 * @returns 重复实例列表
 */
export async function getRecurringTaskInstances(taskId: string): Promise<{
  id: string
  title: string
  dueDate: Date
  status: string
}[]> {
  const task = await prisma.task.findUnique({
    where: { id: taskId }
  })

  if (!task || !task.repeat) {
    return []
  }

  // 查找相同标题、项目、负责人的所有任务
  const instances = await prisma.task.findMany({
    where: {
      projectId: task.projectId,
      title: task.title,
      assigneeId: task.assigneeId,
      repeat: task.repeat,
      deletedAt: null
    },
    select: {
      id: true,
      title: true,
      dueDate: true,
      status: true
    },
    orderBy: {
      dueDate: 'asc'
    }
  })

  return instances
}
