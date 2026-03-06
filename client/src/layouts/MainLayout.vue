<template>
  <div class="flex h-screen bg-gray-50">
    <!-- 侧边栏 -->
    <aside
      class="w-64 bg-slate-900 text-white flex flex-col fixed h-full z-30 transition-transform duration-300"
      :class="{ '-translate-x-full md:translate-x-0': !sidebarOpen }"
    >
      <!-- Logo -->
      <div class="p-4 border-b border-slate-700">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <Calendar class="w-6 h-6" />
          </div>
          <div>
            <h1 class="text-lg font-bold">中集智历</h1>
            <p class="text-xs text-slate-400">协同日历管理系统</p>
          </div>
        </div>
      </div>

      <!-- 导航菜单 -->
      <nav class="flex-1 p-4 overflow-y-auto">
        <ul class="space-y-2">
          <li>
            <NavItem
              to="/dashboard"
              icon="LayoutDashboard"
              label="概览"
              :active="currentRoute === '/dashboard'"
            />
          </li>
          <li>
            <NavItem
              to="/calendar"
              icon="Calendar"
              label="日历"
              :active="currentRoute === '/calendar'"
            />
          </li>
          <li>
            <NavItem
              to="/projects"
              icon="FolderKanban"
              label="项目"
              :active="currentRoute.startsWith('/projects')"
            />
          </li>
          <li>
            <NavItem
              to="/reports"
              icon="FileText"
              label="总结归档"
              :active="currentRoute === '/reports'"
            />
          </li>
        </ul>
      </nav>

      <!-- 用户信息 -->
      <div class="p-4 border-t border-slate-700">
        <div class="flex items-center gap-3">
          <div
            class="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden"
          >
            <img
              v-if="authStore.user?.avatar"
              :src="authStore.user.avatar"
              alt="头像"
              class="w-full h-full object-cover"
            />
            <User v-else class="w-5 h-5" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium truncate">
              {{ authStore.user?.nickname || '用户' }}
            </p>
            <p class="text-xs text-slate-400 truncate">
              {{ authStore.user?.email }}
            </p>
          </div>
          <button
            @click="handleLogout"
            class="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            title="退出登录"
          >
            <LogOut class="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>

    <!-- 主内容区 -->
    <div class="flex-1 md:ml-64 flex flex-col">
      <!-- 顶部栏 -->
      <header class="h-16 bg-white border-b border-gray-200 flex items-center px-4 sticky top-0 z-20">
        <!-- 移动端菜单按钮 -->
        <button
          @click="sidebarOpen = !sidebarOpen"
          class="md:hidden p-2 hover:bg-gray-100 rounded-lg mr-2"
        >
          <Menu class="w-6 h-6" />
        </button>

        <!-- 面包屑或标题 -->
        <div class="flex-1">
          <h2 class="text-lg font-semibold text-gray-800">{{ pageTitle }}</h2>
        </div>

        <!-- 全局搜索 -->
        <div class="mr-4 hidden md:block">
          <GlobalSearch />
        </div>

        <!-- 右侧操作区 -->
        <div class="flex items-center gap-4">
          <!-- 通知按钮 -->
          <button
            @click="showNotifications = !showNotifications"
            class="relative p-2 hover:bg-gray-100 rounded-lg"
          >
            <Bell class="w-5 h-5 text-gray-600" />
            <span
              v-if="notificationStore.unreadCount > 0"
              class="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center"
            >
              {{ notificationStore.unreadCount > 9 ? '9+' : notificationStore.unreadCount }}
            </span>
          </button>

          <!-- 设置按钮 -->
          <router-link
            to="/settings"
            class="p-2 hover:bg-gray-100 rounded-lg"
          >
            <Settings class="w-5 h-5 text-gray-600" />
          </router-link>
        </div>
      </header>

      <!-- 页面内容 -->
      <main class="flex-1 overflow-auto p-4 md:p-6">
        <router-view />
      </main>
    </div>

    <!-- 移动端遮罩 -->
    <div
      v-if="sidebarOpen"
      @click="sidebarOpen = false"
      class="fixed inset-0 bg-black/50 z-20 md:hidden"
    ></div>

    <!-- 通知面板 -->
    <NotificationPanel
      v-if="showNotifications"
      @close="showNotifications = false"
    />

    <!-- 快捷键帮助对话框 -->
    <ShortcutHelp
      v-if="showShortcutHelp"
      @close="showShortcutHelp = false"
    />

    <!-- 全局任务创建对话框 -->
    <TaskForm
      v-if="showCreateTask"
      @close="showCreateTask = false"
      @saved="handleTaskSaved"
    />
  </div>
</template>

<script setup lang="ts">
/**
 * 中集智历 - 主布局组件
 */
import { ref, computed, onMounted, provide } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Calendar, User, LogOut, Menu, Bell, Settings } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notification'
import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts'
import NavItem from '@/components/common/NavItem.vue'
import NotificationPanel from '@/components/common/NotificationPanel.vue'
import GlobalSearch from '@/components/common/GlobalSearch.vue'
import ShortcutHelp from '@/components/common/ShortcutHelp.vue'
import TaskForm from '@/components/task/TaskForm.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const notificationStore = useNotificationStore()
const { registerAll } = useKeyboardShortcuts()

// 状态
const sidebarOpen = ref(false)
const showNotifications = ref(false)
const showShortcutHelp = ref(false)
const showCreateTask = ref(false)

// 提供全局方法给子组件
provide('openNewTask', () => {
  showCreateTask.value = true
})
provide('openGlobalSearch', () => {
  window.dispatchEvent(new CustomEvent('global-search-focus'))
})
provide('openShortcutHelp', () => {
  showShortcutHelp.value = true
})
provide('closeDialog', () => {
  showShortcutHelp.value = false
  showCreateTask.value = false
  showNotifications.value = false
})

// 当前路由
const currentRoute = computed(() => route.path)

// 页面标题
const pageTitle = computed(() => {
  const meta = route.meta as { title?: string }
  return meta?.title || '中集智历'
})

// 退出登录
function handleLogout() {
  authStore.logout()
  router.push('/login')
}

// 关闭所有对话框
function closeAllDialogs() {
  showShortcutHelp.value = false
  showCreateTask.value = false
  showNotifications.value = false
}

// 任务保存后的处理
function handleTaskSaved() {
  showCreateTask.value = false
  // 可以在这里添加刷新任务列表的逻辑
}

// 切换日历视图
function switchCalendarView(view: string) {
  if (currentRoute.value.startsWith('/calendar')) {
    // 通过 provide 通知日历页面切换视图
    // 日历页面需要注入并处理这个事件
    window.dispatchEvent(new CustomEvent('calendar-view-change', { detail: view }))
  } else {
    // 如果不在日历页面，先跳转到日历页面
    router.push('/calendar')
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('calendar-view-change', { detail: view }))
    }, 100)
  }
}

// 注册全局快捷键
registerAll([
  // 新建任务: Ctrl/Cmd + N
  {
    key: 'n',
    ctrl: true,
    action: () => {
      showCreateTask.value = true
    },
    description: '新建任务'
  },
  // 打开全局搜索: Ctrl/Cmd + K
  {
    key: 'k',
    ctrl: true,
    action: () => {
      window.dispatchEvent(new CustomEvent('global-search-focus'))
    },
    description: '打开全局搜索'
  },
  // 显示快捷键帮助: Ctrl/Cmd + /
  {
    key: '/',
    ctrl: true,
    action: () => {
      showShortcutHelp.value = true
    },
    description: '显示快捷键帮助'
  },
  // 显示快捷键帮助: ? (Shift + /)
  {
    key: '?',
    shift: true,
    action: () => {
      showShortcutHelp.value = true
    },
    description: '显示快捷键帮助'
  },
  // 关闭对话框: Escape
  {
    key: 'Escape',
    action: closeAllDialogs,
    description: '关闭当前对话框'
  },
  // 切换到年视图: 1
  {
    key: '1',
    action: () => switchCalendarView('year'),
    description: '切换到年视图'
  },
  // 切换到月视图: 2
  {
    key: '2',
    action: () => switchCalendarView('month'),
    description: '切换到月视图'
  },
  // 切换到周视图: 3
  {
    key: '3',
    action: () => switchCalendarView('week'),
    description: '切换到周视图'
  },
  // 切换到日视图: 4
  {
    key: '4',
    action: () => switchCalendarView('day'),
    description: '切换到日视图'
  },
  // 切换到列表视图: 5
  {
    key: '5',
    action: () => switchCalendarView('list'),
    description: '切换到列表视图'
  },
  // 切换到甘特图视图: 6
  {
    key: '6',
    action: () => switchCalendarView('gantt'),
    description: '切换到甘特图视图'
  }
])

// 获取通知数据
onMounted(async () => {
  if (authStore.isAuthenticated) {
    await notificationStore.fetchNotifications()
  }
})
</script>
