<template>
  <div class="fixed right-4 top-16 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 fade-in">
    <!-- 头部 -->
    <div class="flex items-center justify-between p-4 border-b border-gray-200">
      <h3 class="font-semibold text-gray-800">通知</h3>
      <div class="flex items-center gap-2">
        <button
          v-if="notificationStore.unreadCount > 0"
          @click="handleMarkAllAsRead"
          class="text-xs text-blue-600 hover:text-blue-700"
        >
          全部已读
        </button>
        <button @click="$emit('close')" class="p-1 hover:bg-gray-100 rounded">
          <X class="w-4 h-4 text-gray-500" />
        </button>
      </div>
    </div>

    <!-- 通知列表 -->
    <div class="max-h-96 overflow-y-auto">
      <div v-if="notificationStore.loading" class="p-4 text-center text-gray-500">
        加载中...
      </div>
      <div v-else-if="notificationStore.notifications.length === 0" class="p-4 text-center text-gray-500">
        暂无通知
      </div>
      <ul v-else>
        <li
          v-for="notification in notificationStore.notifications"
          :key="notification.id"
          class="p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
          :class="{ 'bg-blue-50': !notification.isRead }"
          @click="handleNotificationClick(notification)"
        >
          <div class="flex items-start gap-3">
            <div
              class="w-2 h-2 rounded-full mt-2 flex-shrink-0"
              :class="notification.isRead ? 'bg-gray-300' : 'bg-blue-600'"
            ></div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-800">{{ notification.title }}</p>
              <p v-if="notification.content" class="text-xs text-gray-500 mt-1 line-clamp-2">
                {{ notification.content }}
              </p>
              <p class="text-xs text-gray-400 mt-1">
                {{ getRelativeTime(notification.createdAt) }}
              </p>
            </div>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 中集智历 - 通知面板组件
 */
import { X } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { useNotificationStore } from '@/stores/notification'
import { getRelativeTime } from '@/utils/date'
import type { Notification } from '@/types/notification'

const emit = defineEmits<{
  close: []
}>()

const router = useRouter()
const notificationStore = useNotificationStore()

// 点击通知
async function handleNotificationClick(notification: Notification) {
  if (!notification.isRead) {
    await notificationStore.markAsRead(notification.id)
  }

  // 根据通知关联类型跳转到相应页面
  if (notification.relatedType && notification.relatedId) {
    switch (notification.relatedType) {
      case 'TASK':
        router.push(`/tasks/${notification.relatedId}`)
        break
      case 'PROJECT':
        router.push(`/projects/${notification.relatedId}`)
        break
      default:
        // 其他类型暂不处理跳转
        break
    }
  }

  emit('close')
}

// 标记全部已读
async function handleMarkAllAsRead() {
  await notificationStore.markAllAsRead()
}
</script>
