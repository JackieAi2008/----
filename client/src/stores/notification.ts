/**
 * 中集智历 - 通知状态管理
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Notification } from '@/types/notification'
import * as notificationApi from '@/api/notification'

export const useNotificationStore = defineStore('notification', () => {
  // 状态
  const notifications = ref<Notification[]>([])
  const loading = ref(false)

  // 计算属性
  const unreadCount = computed(() =>
    notifications.value.filter(n => !n.isRead).length
  )
  const unreadNotifications = computed(() =>
    notifications.value.filter(n => !n.isRead)
  )

  // 获取通知列表
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

  // 标记通知为已读
  async function markAsRead(id: string) {
    await notificationApi.markAsRead(id)
    const notification = notifications.value.find(n => n.id === id)
    if (notification) {
      notification.isRead = true
    }
  }

  // 标记所有通知为已读
  async function markAllAsRead() {
    await notificationApi.markAllAsRead()
    notifications.value.forEach(n => {
      n.isRead = true
    })
  }

  // 删除通知
  async function deleteNotification(id: string) {
    await notificationApi.deleteNotification(id)
    notifications.value = notifications.value.filter(n => n.id !== id)
  }

  return {
    notifications,
    loading,
    unreadCount,
    unreadNotifications,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification
  }
})
