/**
 * 中集智历 - 消息中心控制器 (r0 §4)
 *
 * 新端点 (与老 /api/notifications 共存):
 *   GET    /api/messages                            分页 + 过滤 (category/priority/read)
 *   GET    /api/messages/unread-count-by-category   角标聚合
 *   POST   /api/messages/mark-all-read              标记全部 / 单 category 已读
 *   POST   /api/messages/:id/read                   标记单条已读
 */
import { Request, Response } from 'express'
import prisma from '../config/database.js'

/**
 * 允许的 category 值(防御性校验,避免脏数据)
 */
const ALLOWED_CATEGORIES = ['TASK_REMINDER', 'INVITE', 'EVALUATION', 'MENTION', 'SYSTEM'] as const
const ALLOWED_PRIORITIES = ['NORMAL', 'HIGH'] as const

function isCategory(v: unknown): v is typeof ALLOWED_CATEGORIES[number] {
  return typeof v === 'string' && (ALLOWED_CATEGORIES as readonly string[]).includes(v)
}
function isPriority(v: unknown): v is typeof ALLOWED_PRIORITIES[number] {
  return typeof v === 'string' && (ALLOWED_PRIORITIES as readonly string[]).includes(v)
}

/**
 * GET /api/messages
 * Query:
 *   - category: TASK_REMINDER | INVITE | EVALUATION | MENTION | SYSTEM
 *   - priority: NORMAL | HIGH
 *   - read:     'true' | 'false'
 *   - page:     default 1
 *   - pageSize: default 20, max 100
 *
 * Response:
 *   { items, total, page, pageSize, totalPages, unreadCount }
 */
export async function listMessages(req: Request, res: Response) {
  const userId = (req as { userId?: string }).userId
  if (!userId) {
    res.status(401).json({ success: false, message: '未登录' })
    return
  }

  const { category, priority, read } = req.query
  const page = Math.max(1, Number(req.query.page) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20))

  const where: Record<string, unknown> = { userId }
  if (isCategory(category)) where.category = category
  if (isPriority(priority)) where.priority = priority
  if (read === 'true') where.isRead = true
  if (read === 'false') where.isRead = false

  const [rawItems, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId, isRead: false } })
  ])

  // 应用层按 priority 排序:HIGH 优先,然后 createdAt desc(与查询顺序一致)。
  // 直接用 SQL CASE 排序也能做,但 Prisma 不支持表达式 orderBy,
  // 而且 priority 字段未来会扩展,应用层排更灵活。
  const priorityRank: Record<string, number> = { HIGH: 0, NORMAL: 1 }
  const items = [...rawItems].sort((a, b) => {
    const pa = priorityRank[a.priority] ?? 9
    const pb = priorityRank[b.priority] ?? 9
    if (pa !== pb) return pa - pb
    return b.createdAt.getTime() - a.createdAt.getTime()
  })

  res.json({
    success: true,
    data: {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      unreadCount
    }
  })
}

/**
 * GET /api/messages/unread-count-by-category
 * Response: { TASK_REMINDER, INVITE, EVALUATION, MENTION, SYSTEM, total }
 */
export async function unreadCountByCategory(req: Request, res: Response) {
  const userId = (req as { userId?: string }).userId
  if (!userId) {
    res.status(401).json({ success: false, message: '未登录' })
    return
  }

  const grouped = await prisma.notification.groupBy({
    by: ['category'],
    where: { userId, isRead: false },
    _count: { _all: true }
  })

  // 初始化所有 category = 0,确保前端拿到的结构稳定
  const result: Record<string, number> = {
    TASK_REMINDER: 0,
    INVITE: 0,
    EVALUATION: 0,
    MENTION: 0,
    SYSTEM: 0
  }
  for (const row of grouped) {
    if (isCategory(row.category)) {
      result[row.category] = row._count._all
    }
  }
  const total = Object.values(result).reduce((s, n) => s + n, 0)

  res.json({
    success: true,
    data: { ...result, total }
  })
}

/**
 * POST /api/messages/mark-all-read
 * Body: { category?: string }  不传 = 全部
 * Response: { updated: number }
 */
export async function markAllRead(req: Request, res: Response) {
  const userId = (req as { userId?: string }).userId
  if (!userId) {
    res.status(401).json({ success: false, message: '未登录' })
    return
  }

  const { category } = (req.body ?? {}) as { category?: unknown }
  const where: Record<string, unknown> = { userId, isRead: false }
  if (isCategory(category)) where.category = category

  const result = await prisma.notification.updateMany({
    where,
    data: { isRead: true }
  })

  res.json({
    success: true,
    data: { updated: result.count }
  })
}

/**
 * POST /api/messages/:id/read
 * 标记单条已读(仅自己的)
 */
export async function markOneRead(req: Request, res: Response) {
  const userId = (req as { userId?: string }).userId
  if (!userId) {
    res.status(401).json({ success: false, message: '未登录' })
    return
  }
  const { id } = req.params
  const result = await prisma.notification.updateMany({
    where: { id, userId },
    data: { isRead: true }
  })
  res.json({
    success: true,
    data: { updated: result.count }
  })
}
