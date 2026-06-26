/**
 * 中集智历 - 通知状态管理 (r0 §4 改造)
 *
 * 保留老 store 字段(notifications / unreadCount)以免破坏现有调用点。
 * 新增:
 *   - unreadByCategory: 角标聚合
 *   - fetchUnreadByCategory(): 拉聚合
 *   - markAllMessagesRead(category?): 走新端点
 *   - markMessageRead(id): 走新端点(单条)
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Notification, UnreadByCategory } from '@/types/notification'
import * as notificationApi from '@/api/notification'
import {
  getUnreadByCategory,
  markAllMessagesRead,
  markMessageRead,
  routeForMessage
} from '@/api/messages'

const EMPTY_UNREAD: UnreadByCategory = {
  TASK_REMINDER: 0,
  INVITE: 0,
  EVALUATION: 0,
  MENTION: 0,
  SYSTEM: 0,
  total: 0
}

export const useNotificationStore = defineStore('notification', () => {
  // 状态
  const notifications = ref<Notification[]>([])
  const loading = ref(false)
  const unreadByCategory = ref<UnreadByCategory>({ ...EMPTY_UNREAD })

  // 计算属性
  const unreadCount = computed(() => unreadByCategory.value.total)
  const unreadNotifications = computed(() =>
    notifications.value.filter((n) => !n.isRead)
  )

  // 获取通知列表(老端点)
  async function fetchNotifications() {
    loading.value = true
    try {
      const response = await notificationApi.getNotifications()
      notifications.value = response
      return response
    } finally {
      loading.value = false
    }
  }

  /**
   * 拉取按 category 聚合的未读数(铃铛角标 + 消息中心 tab 角标)
   */
  async function fetchUnreadByCategory() {
    try {
      const data = await getUnreadByCategory()
      unreadByCategory.value = data
      return data
    } catch {
      // 静默失败,保留旧值
      return unreadByCategory.value
    }
  }

  // 标记单条已读(走新端点 /api/messages/:id/read,失败则回落到老端点)
  async function markAsRead(id: string) {
    try {
      await markMessageRead(id)
    } catch {
      await notificationApi.markAsRead(id)
    }
    const notification = notifications.value.find((n) => n.id === id)
    if (notification && !notification.isRead) {
      // 同步本地 + 触发聚合刷新
      notification.isRead = true
      // 简化:本地扣减对应 category 计数
      const cat = notification.category as keyof UnreadByCategory
      if (unreadByCategory.value[cat] > 0) {
        unreadByCategory.value[cat] = Math.max(
          0,
          unreadByCategory.value[cat] - 1
        ) as never
      }
      unreadByCategory.value.total = Math.max(0, unreadByCategory.value.total - 1)
    }
  }

  /**
   * 标记全部已读(可限定 category)
   * category 缺省 = 全部
   */
  async function markAllAsRead(category?: string) {
    try {
      const res = await markAllMessagesRead(category)
      // 老 store 字段同步
      notifications.value.forEach((n) => {
        if (!category || n.category === category) {
          n.isRead = true
        }
      })
      // 拉一次最新聚合确保一致
      await fetchUnreadByCategory()
      return res.updated
    } catch {
      // 回落到老端点
      await notificationApi.markAllAsRead()
      notifications.value.forEach((n) => (n.isRead = true))
      await fetchUnreadByCategory()
      return 0
    }
  }

  // 兼容老 markAllAsRead 调用(无参)
  async function markAllAsReadLegacy() {
    return markAllAsRead()
  }

  // 删除通知
  async function deleteNotification(id: string) {
    await notificationApi.deleteNotification(id)
    notifications.value = notifications.value.filter((n) => n.id !== id)
  }

  /**
   * 计算一条通知的跳转 URL
   */
  function routeFor(n: Notification): string | null {
    return routeForMessage(n)
  }

  return {
    notifications,
    loading,
    unreadCount,
    unreadByCategory,
    unreadNotifications,
    fetchNotifications,
    fetchUnreadByCategory,
    markAsRead,
    markAllAsRead,
    markAllAsReadLegacy,
    deleteNotification,
    routeFor
  }
})
