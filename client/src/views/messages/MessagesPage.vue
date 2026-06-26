<template>
  <div class="flex flex-col h-full" data-testid="messages-page">
    <!-- 顶部条 -->
    <div
      class="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b"
      :style="{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }"
    >
      <div>
        <h1
          class="text-lg md:text-xl font-semibold"
          :style="{ color: 'var(--color-text-primary)' }"
        >
          消息中心
        </h1>
        <p
          class="text-xs mt-0.5"
          :style="{ color: 'var(--color-text-secondary)' }"
        >
          任务提醒 / 邀请 / 评价 / @我 / 系统通知
        </p>
      </div>
      <button
        :disabled="markingAll || totalUnread === 0"
        @click="handleMarkAllRead"
        class="px-3 md:px-4 py-1.5 md:py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        :style="{
          backgroundColor: 'var(--color-primary)',
          color: 'white'
        }"
        data-testid="mark-all-read"
      >
        {{ markingAll ? '处理中…' : '全部标已读' }}
      </button>
    </div>

    <!-- 主体:左侧 tab + 右侧列表 -->
    <div class="flex flex-1 overflow-hidden">
      <!-- 左侧 tab (桌面) -->
      <aside
        class="hidden md:block w-56 border-r overflow-y-auto"
        :style="{
          backgroundColor: 'var(--color-bg-card)',
          borderColor: 'var(--color-border)'
        }"
      >
        <ul class="p-2 space-y-1">
          <li v-for="t in tabs" :key="t.key">
            <button
              @click="selectCategory(t.key)"
              :class="[
                'w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                currentCategory === t.key
                  ? 'bg-blue-50 text-blue-700'
                  : 'hover:bg-gray-50 text-gray-700'
              ]"
              :data-testid="`tab-${t.key}`"
            >
              <span class="flex items-center gap-2">
                <component :is="t.icon" class="w-4 h-4" />
                <span>{{ t.label }}</span>
              </span>
              <span
                v-if="unreadByCategory[t.key] > 0"
                class="text-xs font-semibold rounded-full min-w-[20px] h-5 px-1.5 inline-flex items-center justify-center bg-red-500 text-white"
                :data-testid="`unread-badge-${t.key}`"
              >
                {{ unreadByCategory[t.key] }}
              </span>
            </button>
          </li>
        </ul>
      </aside>

      <!-- 移动端横滑 tab -->
      <div class="md:hidden border-b overflow-x-auto whitespace-nowrap" :style="{ borderColor: 'var(--color-border)' }">
        <button
          v-for="t in tabs"
          :key="t.key"
          @click="selectCategory(t.key)"
          :class="[
            'inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
            currentCategory === t.key
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600'
          ]"
        >
          {{ t.label }}
          <span
            v-if="unreadByCategory[t.key] > 0"
            class="text-xs font-semibold rounded-full min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center bg-red-500 text-white"
          >
            {{ unreadByCategory[t.key] }}
          </span>
        </button>
      </div>

      <!-- 右侧消息列表 -->
      <main class="flex-1 overflow-y-auto" ref="listRef" @scroll="onScroll">
        <div
          v-if="loading && items.length === 0"
          class="p-8 text-center text-gray-500"
        >
          加载中…
        </div>
        <div
          v-else-if="items.length === 0"
          class="p-8 text-center text-gray-500"
          data-testid="empty-state"
        >
          <BellOff class="w-12 h-12 mx-auto text-gray-300 mb-2" />
          <p>暂无消息</p>
        </div>
        <ul v-else class="divide-y" :style="{ borderColor: 'var(--color-border)' }">
          <li
            v-for="m in items"
            :key="m.id"
            @click="handleItemClick(m)"
            class="px-4 md:px-6 py-3 md:py-4 cursor-pointer transition-colors hover:bg-gray-50"
            :class="{ 'bg-blue-50/50': !m.isRead }"
            :data-testid="`message-item-${m.id}`"
          >
            <div class="flex items-start gap-3">
              <div
                class="w-9 h-9 md:w-10 md:h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                :class="categoryColor(m.category)"
              >
                <component
                  :is="categoryIcon(m.category)"
                  class="w-4 h-4 md:w-5 md:h-5"
                />
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <span
                    v-if="!m.isRead"
                    class="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0"
                    data-testid="unread-dot"
                  ></span>
                  <p
                    class="text-sm md:text-base font-medium truncate"
                    :class="m.isRead ? 'text-gray-700' : 'text-gray-900'"
                  >
                    {{ m.title }}
                  </p>
                  <span
                    v-if="m.priority === 'HIGH'"
                    class="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-100 text-red-700"
                  >
                    紧急
                  </span>
                  <span
                    class="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600"
                  >
                    {{ categoryLabel(m.category) }}
                  </span>
                </div>
                <p
                  v-if="m.content"
                  class="text-xs md:text-sm text-gray-500 mt-1 line-clamp-2"
                >
                  {{ m.content }}
                </p>
                <p class="text-xs text-gray-400 mt-1">
                  {{ formatTime(m.createdAt) }}
                </p>
              </div>
            </div>
          </li>
        </ul>
        <div
          v-if="loadingMore"
          class="p-4 text-center text-gray-400 text-sm"
        >
          加载更多…
        </div>
        <div
          v-else-if="items.length > 0 && page >= totalPages"
          class="p-4 text-center text-gray-400 text-xs"
        >
          — 没有更多了 —
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 中集智历 - 消息中心页面 (r0 §4)
 *
 * 左侧 Tab 切换 category, 右侧无限滚动列表。
 * 顶部「全部标已读」按钮 → POST /api/messages/mark-all-read。
 * 单条点击 → 标记已读 + 跳转(SYSTEM 不跳)。
 */
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  Bell,
  BellOff,
  Clock,
  UserPlus,
  Star,
  AtSign,
  Info,
  Inbox
} from 'lucide-vue-next'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useNotificationStore } from '@/stores/notification'
import { listMessages } from '@/api/messages'
import {
  NOTIFICATION_CATEGORY_NAMES,
  NOTIFICATION_CATEGORY_ICONS,
  NOTIFICATION_CATEGORY_COLORS
} from '@/types/notification'
import type {
  Notification,
  NotificationCategory,
  UnreadByCategory
} from '@/types/notification'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

const router = useRouter()
const notificationStore = useNotificationStore()

// Tab 定义
type CategoryKey = 'ALL' | NotificationCategory
const tabs: Array<{
  key: CategoryKey
  label: string
  icon: typeof Inbox
}> = [
  { key: 'ALL', label: '全部', icon: Inbox },
  { key: 'TASK_REMINDER', label: '任务提醒', icon: Clock },
  { key: 'INVITE', label: '邀请', icon: UserPlus },
  { key: 'EVALUATION', label: '评价', icon: Star },
  { key: 'MENTION', label: '@我', icon: AtSign },
  { key: 'SYSTEM', label: '系统', icon: Info }
]

const currentCategory = ref<CategoryKey>('ALL')
const items = ref<Notification[]>([])
const page = ref(1)
const pageSize = 20
const totalPages = ref(0)
const total = ref(0)
const loading = ref(false)
const loadingMore = ref(false)
const markingAll = ref(false)
const listRef = ref<HTMLElement | null>(null)

const unreadByCategory = computed<Record<CategoryKey, number>>(() => {
  const u = notificationStore.unreadByCategory as UnreadByCategory
  return {
    ALL: u.total,
    TASK_REMINDER: u.TASK_REMINDER,
    INVITE: u.INVITE,
    EVALUATION: u.EVALUATION,
    MENTION: u.MENTION,
    SYSTEM: u.SYSTEM
  }
})

const totalUnread = computed(() => notificationStore.unreadCount)

// 工具
function categoryLabel(cat: string): string {
  return (
    NOTIFICATION_CATEGORY_NAMES[cat as NotificationCategory] ?? cat
  )
}
function categoryColor(cat: string): string {
  return (
    NOTIFICATION_CATEGORY_COLORS[cat as NotificationCategory] ?? 'text-gray-600 bg-gray-50'
  )
}
function categoryIcon(cat: string): typeof Bell {
  const name = NOTIFICATION_CATEGORY_ICONS[cat as NotificationCategory]
  const map: Record<string, typeof Bell> = {
    Clock,
    UserPlus,
    Star,
    AtSign,
    Info
  }
  return map[name] ?? Bell
}
function formatTime(iso: string): string {
  const d = dayjs(iso)
  const now = dayjs()
  if (now.diff(d, 'day') < 1) return d.fromNow()
  if (now.diff(d, 'day') < 7) return d.format('MM-DD HH:mm')
  return d.format('YYYY-MM-DD HH:mm')
}

// 加载
async function loadPage(p: number, reset: boolean) {
  if (reset) loading.value = true
  else loadingMore.value = true
  try {
    const data = await listMessages({
      category:
        currentCategory.value === 'ALL'
          ? undefined
          : (currentCategory.value as string),
      page: p,
      pageSize
    })
    if (reset) {
      items.value = data.items
    } else {
      items.value = items.value.concat(data.items)
    }
    total.value = data.total
    totalPages.value = data.totalPages
    page.value = data.page
  } catch (err) {
    console.error('[MessagesPage] load error', err)
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

function selectCategory(key: CategoryKey) {
  if (currentCategory.value === key) return
  currentCategory.value = key
  page.value = 1
  totalPages.value = 0
  items.value = []
  if (listRef.value) listRef.value.scrollTop = 0
  loadPage(1, true)
}

function onScroll(e: Event) {
  const el = e.target as HTMLElement
  if (loadingMore.value || page.value >= totalPages.value) return
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 80) {
    loadPage(page.value + 1, false)
  }
}

async function handleItemClick(m: Notification) {
  // 标记已读
  if (!m.isRead) {
    m.isRead = true
    await notificationStore.markAsRead(m.id)
  }
  // 跳转
  const url = notificationStore.routeFor(m)
  if (url) {
    router.push(url)
  }
  // SYSTEM 不跳,本地展开 content 已经在 <p> 显示
}

async function handleMarkAllRead() {
  markingAll.value = true
  try {
    const category =
      currentCategory.value === 'ALL' ? undefined : currentCategory.value
    await notificationStore.markAllAsRead(category as string | undefined)
    // 刷新列表(因为聚合变了)
    await loadPage(1, true)
  } finally {
    markingAll.value = false
  }
}

onMounted(async () => {
  // 先拉聚合
  await notificationStore.fetchUnreadByCategory()
  // 再拉列表
  await loadPage(1, true)
})

// 监听聚合刷新(被 store 内部调用时触发)
watch(
  () => notificationStore.unreadByCategory,
  () => {
    // 聚合变化时,刷新当前列表
    loadPage(1, true)
  },
  { deep: true }
)
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
