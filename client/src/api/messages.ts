/**
 * 中集智历 - 消息中心 API (r0 §4)
 *
 * 新端点:
 *   GET    /api/messages                            列表(分页 + 过滤)
 *   GET    /api/messages/unread-count-by-category   角标聚合
 *   POST   /api/messages/mark-all-read              全部 / 单 category 标已读
 *   POST   /api/messages/:id/read                   单条标已读
 *
 * 老端点 /api/notifications 继续可用,见 ./notification.ts。
 */
import { get, post } from '@/utils/request'
import type {
  Notification,
  NotificationCategory,
  PaginatedMessages,
  UnreadByCategory,
  MarkAllReadResponse
} from '@/types/notification'

export interface ListMessagesParams {
  category?: NotificationCategory | string
  priority?: 'NORMAL' | 'HIGH' | string
  read?: 'true' | 'false'
  page?: number
  pageSize?: number
}

/**
 * 拉取消息列表
 */
export async function listMessages(
  params: ListMessagesParams = {}
): Promise<PaginatedMessages> {
  const search: Record<string, string> = {}
  if (params.category) search.category = String(params.category)
  if (params.priority) search.priority = String(params.priority)
  if (params.read) search.read = params.read
  if (params.page) search.page = String(params.page)
  if (params.pageSize) search.pageSize = String(params.pageSize)

  const res = await get<PaginatedMessages>('/messages', { params: search })
  return (
    res.data ?? {
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 0,
      unreadCount: 0
    }
  )
}

/**
 * 按 category 聚合的未读数
 */
export async function getUnreadByCategory(): Promise<UnreadByCategory> {
  const res = await get<UnreadByCategory>('/messages/unread-count-by-category')
  return (
    res.data ?? {
      TASK_REMINDER: 0,
      INVITE: 0,
      EVALUATION: 0,
      MENTION: 0,
      SYSTEM: 0,
      total: 0
    }
  )
}

/**
 * 标记全部(可限定 category)已读
 */
export async function markAllMessagesRead(
  category?: NotificationCategory | string
): Promise<MarkAllReadResponse> {
  const body: Record<string, string> = {}
  if (category) body.category = String(category)
  const res = await post<MarkAllReadResponse>('/messages/mark-all-read', body)
  return res.data ?? { updated: 0 }
}

/**
 * 标记单条已读
 */
export async function markMessageRead(id: string): Promise<MarkAllReadResponse> {
  const res = await post<MarkAllReadResponse>(`/messages/${id}/read`)
  return res.data ?? { updated: 0 }
}

/**
 * 直接把 Notification 转成跳转 URL (前端 spec §6)
 */
export function routeForMessage(n: Notification): string | null {
  // 优先按 category 路由(SYSTEM 不跳)
  switch (n.category) {
    case 'TASK_REMINDER':
      return n.relatedId ? `/tasks/${n.relatedId}` : null
    case 'INVITE':
      return n.relatedId ? `/projects?invite=${n.relatedId}` : '/projects'
    case 'EVALUATION':
      return n.relatedId ? `/tasks/${n.relatedId}?tab=evaluation` : null
    case 'MENTION':
      return n.relatedId
        ? `/tasks/${n.relatedId}?comment=${n.relatedId}`
        : null
    case 'SYSTEM':
    default:
      return null
  }
}
