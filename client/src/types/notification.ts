/**
 * 中集智历 - 通知类型定义 (r0 §4)
 *
 * 字段重命名: `type` -> `category`,新增 `priority`
 * 老 `type` 枚举仍然保留为内部 type(由后端 service 推断),仅用于前端展示。
 */

// 通知 category (r0 §4 新枚举)
export type NotificationCategory =
  | 'TASK_REMINDER'
  | 'INVITE'
  | 'EVALUATION'
  | 'MENTION'
  | 'SYSTEM'

export const NOTIFICATION_CATEGORIES: NotificationCategory[] = [
  'TASK_REMINDER',
  'INVITE',
  'EVALUATION',
  'MENTION',
  'SYSTEM'
]

export type NotificationPriority = 'NORMAL' | 'HIGH'

// 关联类型
export type RelatedType = 'TASK' | 'PROJECT' | 'COMMENT' | 'USER'

// 通知基础信息
export interface Notification {
  id: string
  userId: string
  category: NotificationCategory | string
  title: string
  content: string | null
  relatedType: RelatedType | string | null
  relatedId: string | null
  isRead: boolean
  priority: NotificationPriority | string
  createdAt: string
}

// 通知 category 显示名称
export const NOTIFICATION_CATEGORY_NAMES: Record<NotificationCategory, string> = {
  TASK_REMINDER: '任务提醒',
  INVITE: '邀请',
  EVALUATION: '评价',
  MENTION: '@我',
  SYSTEM: '系统'
}

// 通知 category 图标 (lucide-vue-next 组件名)
export const NOTIFICATION_CATEGORY_ICONS: Record<NotificationCategory, string> = {
  TASK_REMINDER: 'Clock',
  INVITE: 'UserPlus',
  EVALUATION: 'Star',
  MENTION: 'AtSign',
  SYSTEM: 'Info'
}

// 通知 category 颜色 (Tailwind class)
export const NOTIFICATION_CATEGORY_COLORS: Record<NotificationCategory, string> = {
  TASK_REMINDER: 'text-blue-600 bg-blue-50',
  INVITE: 'text-purple-600 bg-purple-50',
  EVALUATION: 'text-yellow-600 bg-yellow-50',
  MENTION: 'text-pink-600 bg-pink-50',
  SYSTEM: 'text-gray-600 bg-gray-50'
}

// 分页响应
export interface PaginatedMessages {
  items: Notification[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  unreadCount: number
}

// 按 category 聚合的未读数
export interface UnreadByCategory {
  TASK_REMINDER: number
  INVITE: number
  EVALUATION: number
  MENTION: number
  SYSTEM: number
  total: number
}

// 标记全部已读响应
export interface MarkAllReadResponse {
  updated: number
}
