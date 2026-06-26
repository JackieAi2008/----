/**
 * 中集智历 - 通知服务
 *
 * r0 §4: 统一封装通知写入,所有调用方都必须经过本 service,
 * 避免 category/priority 字段散落在 controller 里漏填。
 *
 * 字段约定:
 *   category: TASK_REMINDER | INVITE | EVALUATION | MENTION | SYSTEM
 *   priority: NORMAL | HIGH
 *
 * 老的 prisma.notification.create / createMany 直接调用点
 * 已在 §4 重构为 send / sendMany, 老端点 GET /api/notifications
 * 仍然可以工作(自动反映新 schema)。
 */
import type { Prisma, PrismaClient } from '@prisma/client'
import prisma from '../config/database.js'

export type NotificationCategory =
  | 'TASK_REMINDER'
  | 'INVITE'
  | 'EVALUATION'
  | 'MENTION'
  | 'SYSTEM'

export type NotificationPriority = 'NORMAL' | 'HIGH'

export interface SendNotificationInput {
  userId: string
  category: NotificationCategory
  title: string
  content?: string | null
  relatedType?: string | null
  relatedId?: string | null
  priority?: NotificationPriority
}

type Tx = PrismaClient | Prisma.TransactionClient

/**
 * 写入单条通知
 *
 * - 默认 priority=NORMAL
 * - 任务超期(task.dueDate < now 且 status != DONE)的提醒:priority=HIGH
 *   (调用方在 controller 里判断后显式传 HIGH,这里只做默认值)
 */
export async function send(
  input: SendNotificationInput,
  tx: Tx = prisma
) {
  return tx.notification.create({
    data: {
      userId: input.userId,
      category: input.category,
      title: input.title,
      content: input.content ?? null,
      relatedType: input.relatedType ?? null,
      relatedId: input.relatedId ?? null,
      priority: input.priority ?? 'NORMAL'
    }
  })
}

/**
 * 批量写入通知(用 createMany,SQLite 友好)
 */
export async function sendMany(
  inputs: SendNotificationInput[],
  tx: Tx = prisma
) {
  if (inputs.length === 0) return { count: 0 }
  return tx.notification.createMany({
    data: inputs.map((n) => ({
      userId: n.userId,
      category: n.category,
      title: n.title,
      content: n.content ?? null,
      relatedType: n.relatedType ?? null,
      relatedId: n.relatedId ?? null,
      priority: n.priority ?? 'NORMAL'
    }))
  })
}

/**
 * 推断 category 的辅助:基于老的 type 字符串(用于历史代码路径的渐进迁移)。
 * 不建议新代码使用 — 直接传 category 更清晰。
 */
export function inferCategoryFromLegacyType(
  type: string
): NotificationCategory {
  switch (type) {
    case 'PROJECT_INVITE':
    case 'PROJECT_JOIN_REQUEST':
      return 'INVITE'
    case 'TASK_ASSIGNED':
    case 'TASK_DUE':
    case 'TASK_STATUS_CHANGED':
    case 'TASK_COLLABORATOR':
    case 'TASK_RECURRING':
      return 'TASK_REMINDER'
    case 'EVALUATION_SUBMITTED':
      return 'EVALUATION'
    case 'MENTION':
    case 'TASK_COMMENT':
      return 'MENTION'
    case 'PROJECT_JOIN_APPROVED':
    case 'PROJECT_JOIN_REJECTED':
    case 'PROJECT_UPDATED':
    default:
      return 'SYSTEM'
  }
}
