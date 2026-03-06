/**
 * 中集智历 - 通知相关API
 */
import { get, post, del } from '@/utils/request'
import type { Notification } from '@/types/notification'

/**
 * 获取通知列表
 */
export async function getNotifications(): Promise<Notification[]> {
  const response = await get<Notification[]>('/notifications')
  return response.data ?? []
}

/**
 * 获取未读通知数量
 */
export async function getUnreadCount(): Promise<number> {
  const response = await get<{ count: number }>('/notifications/unread-count')
  return response.data?.count ?? 0
}

/**
 * 标记通知为已读
 */
export async function markAsRead(id: string): Promise<void> {
  await post(`/notifications/${id}/read`)
}

/**
 * 标记所有通知为已读
 */
export async function markAllAsRead(): Promise<void> {
  await post('/notifications/read-all')
}

/**
 * 删除通知
 */
export async function deleteNotification(id: string): Promise<void> {
  await del(`/notifications/${id}`)
}
