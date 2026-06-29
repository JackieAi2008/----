/**
 * 中集智历 - 通知服务
 *
 * r0 §4: 统一封装通知写入,所有调用方都必须经过本 service,
 * 避免 category/priority 字段散落在 controller 里漏填。
 *
 * 字段约定:
 *   category: TASK_REMINDER | INVITE | EVALUATION | MENTION(已废弃) | SYSTEM
 *   priority: NORMAL | HIGH
 *
 * r1 §6a microadjust (A1): 所有「@user 聚合」类通知统一使用 TASK_REMINDER
 *   - 历史原因: 老 schema 中 @user 通知分散在 MENTION 和 TASK_COMMENT 两个 type
 *   - 现约定:   未来任何 @user 通知直接 send({ category: 'TASK_REMINDER', ... })
 *   - 旧数据:   历史行 (category=MENTION) 保留不动; 新代码禁止再写入 MENTION
 *   - 注意:     MENTION 仍作为 category 枚举值存在, 仅用于向前兼容老 schema 数据
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
  /** @deprecated r1 §6a: @user 通知已统一到 TASK_REMINDER, 禁止新代码写入 */
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
 *
 * r1 §6a microadjust (A1): 历史 type=MENTION 和 type=TASK_COMMENT 都映射到
 * TASK_REMINDER (与新策略保持一致)。注意:实际历史数据已经通过 §4 migration
 * 写入为 category=MENTION, 本函数仅在「假设历史数据按本函数映射」的场景下
 * 提供参照(比如再次导入外部数据源)。
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
    // r1 §6a: @user 通知统一到 TASK_REMINDER (历史 MENTION/TASK_COMMENT 走同一条路径)
    case 'MENTION':
    case 'TASK_COMMENT':
      return 'TASK_REMINDER'
    case 'PROJECT_JOIN_APPROVED':
    case 'PROJECT_JOIN_REJECTED':
    case 'PROJECT_UPDATED':
    default:
      return 'SYSTEM'
  }
}
