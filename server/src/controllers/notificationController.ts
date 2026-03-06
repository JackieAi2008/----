/**
 * 中集智历 - 通知控制器
 */
import { Request, Response } from 'express'
import prisma from '../config/database.js'

/**
 * 获取通知列表
 */
export async function getNotifications(req: Request, res: Response) {
  const userId = (req as { userId?: string }).userId
  const { page = 1, limit = 20 } = req.query

  const skip = (Number(page) - 1) * Number(limit)

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: Number(limit)
    }),
    prisma.notification.count({ where: { userId } })
  ])

  res.json({
    success: true,
    data: notifications,
    meta: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit))
    }
  })
}

/**
 * 获取未读通知数量
 */
export async function getUnreadCount(req: Request, res: Response) {
  const userId = (req as { userId?: string }).userId

  const count = await prisma.notification.count({
    where: { userId, isRead: false }
  })

  res.json({
    success: true,
    data: { count }
  })
}

/**
 * 标记通知为已读
 */
export async function markAsRead(req: Request, res: Response) {
  const { id } = req.params
  const userId = (req as { userId?: string }).userId

  await prisma.notification.updateMany({
    where: { id, userId },
    data: { isRead: true }
  })

  res.json({
    success: true,
    message: '已标记为已读'
  })
}

/**
 * 标记所有通知为已读
 */
export async function markAllAsRead(req: Request, res: Response) {
  const userId = (req as { userId?: string }).userId

  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true }
  })

  res.json({
    success: true,
    message: '全部已标记为已读'
  })
}

/**
 * 删除通知
 */
export async function deleteNotification(req: Request, res: Response) {
  const { id } = req.params
  const userId = (req as { userId?: string }).userId

  await prisma.notification.deleteMany({
    where: { id, userId }
  })

  res.json({
    success: true,
    message: '通知已删除'
  })
}
