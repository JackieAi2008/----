<template>
  <div
    class="fixed right-4 top-16 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 fade-in"
    data-testid="notification-panel"
  >
    <!-- 头部 -->
    <div class="flex items-center justify-between p-4 border-b border-gray-200">
      <h3 class="font-semibold text-gray-800">通知</h3>
      <div class="flex items-center gap-2">
        <button
          v-if="notificationStore.unreadCount > 0"
          @click="handleMarkAllAsRead"
          class="text-xs text-blue-600 hover:text-blue-700"
          data-testid="panel-mark-all-read"
        >
          全部已读
        </button>
        <button
          @click="$emit('close')"
          class="p-1 hover:bg-gray-100 rounded"
          aria-label="关闭"
        >
          <X class="w-4 h-4 text-gray-500" />
        </button>
      </div>
    </div>

    <!-- 通知列表(最近 5 条) -->
    <div class="max-h-96 overflow-y-auto">
      <div
        v-if="notificationStore.loading"
        class="p-4 text-center text-gray-500"
      >
        加载中...
      </div>
      <div
        v-else-if="recentNotifications.length === 0"
        class="p-4 text-center text-gray-500"
      >
        暂无通知
      </div>
      <ul v-else>
        <li
          v-for="notification in recentNotifications"
          :key="notification.id"
          class="p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
          :class="{ 'bg-blue-50': !notification.isRead }"
          @click="handleNotificationClick(notification)"
          :data-testid="`panel-item-${notification.id}`"
        >
          <div class="flex items-start gap-3">
            <div
              class="w-2 h-2 rounded-full mt-2 flex-shrink-0"
              :class="notification.isRead ? 'bg-gray-300' : 'bg-blue-600'"
            ></div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-800">
                {{ notification.title }}
              </p>
              <p
                v-if="notification.content"
                class="text-xs text-gray-500 mt-1 line-clamp-2"
              >
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

    <!-- 底部:查看全部 -->
    <div class="p-3 border-t border-gray-100 text-center">
      <router-link
        to="/messages"
        @click="$emit('close')"
        class="text-sm text-blue-600 hover:text-blue-700 font-medium"
        data-testid="panel-view-all"
      >
        查看全部 →
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 中集智历 - 通知面板 (r0 §4 改造)
 *
 * - 顶部「全部已读」走 store.markAllAsRead(走新端点)
 * - 角标数字 = store.unreadCount(来自 unread-count-by-category 聚合的 total)
 * - 底部「查看全部 →」跳 /messages
 * - 仅显示最近 5 条
 */
import { computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { X } from 'lucide-vue-next'
import { useNotificationStore } from '@/stores/notification'
import { getRelativeTime } from '@/utils/date'
import type { Notification } from '@/types/notification'

const emit = defineEmits<{
  close: []
}>()

const router = useRouter()
const notificationStore = useNotificationStore()

// 仅展示最近 5 条
const recentNotifications = computed(() =>
  notificationStore.notifications.slice(0, 5)
)

// 点击通知
async function handleNotificationClick(notification: Notification) {
  if (!notification.isRead) {
    await notificationStore.markAsRead(notification.id)
  }
  // 优先按 category 路由(SYSTEM 不跳)
  const url = notificationStore.routeFor(notification)
  if (url) {
    router.push(url)
  }
  emit('close')
}

// 标记全部已读
async function handleMarkAllAsRead() {
  await notificationStore.markAllAsRead()
}

// 轮询刷新(每 60s 拉一次聚合)
let pollTimer: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  notificationStore.fetchUnreadByCategory()
  pollTimer = setInterval(() => {
    notificationStore.fetchUnreadByCategory()
  }, 60_000)
})
onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
})
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.fade-in {
  animation: fadeIn 0.18s ease-out;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
