<template>
  <div class="flex h-screen" style="background-color: var(--color-bg-page)">
    <!-- 侧边栏 -->
    <aside
      class="w-64 flex flex-col fixed h-full z-30 transition-transform duration-300 ease-in-out sidebar-gradient"
      :class="{ '-translate-x-full md:translate-x-0': !sidebarOpen }"
    >
      <!-- Logo -->
      <div class="p-5 border-b border-white/10">
        <div class="flex items-center gap-3">
          <div class="w-11 h-11 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
            <Calendar class="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 class="text-lg font-bold text-white">中集智历</h1>
            <p class="text-xs text-blue-200/70">协同日历管理系统</p>
          </div>
        </div>
      </div>

      <!-- 导航菜单 -->
      <nav class="flex-1 p-4 overflow-y-auto">
        <ul class="space-y-1.5">
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
              :active="currentRoute.startsWith('/projects') && currentRoute !== '/projects/deleted'"
            />
          </li>
          <li>
            <NavItem
              to="/projects/deleted"
              icon="Trash2"
              label="回收站"
              :active="currentRoute === '/projects/deleted'"
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

        <!-- 管理员菜单 -->
        <ul v-if="authStore.isAdmin || authStore.isDepartmentAdmin" class="space-y-1.5 pt-4 mt-4 border-t border-white/10">
          <li>
            <span class="px-3 text-xs font-medium text-blue-200/50 uppercase tracking-wider">管理</span>
          </li>
          <li v-if="authStore.isAdmin">
            <NavItem
              to="/admin/departments"
              icon="Building2"
              label="部门管理"
              :active="currentRoute === '/admin/departments'"
            />
          </li>
          <li v-if="authStore.isAdmin">
            <NavItem
              to="/admin/users"
              icon="Users"
              label="用户管理"
              :active="currentRoute === '/admin/users'"
            />
          </li>
          <li v-if="authStore.isDepartmentAdmin && !authStore.isAdmin">
            <NavItem
              to="/my-department"
              icon="Users"
              label="我的部门"
              :active="currentRoute === '/my-department'"
            />
          </li>
        </ul>
      </nav>

      <!-- 用户信息 -->
      <div class="p-4 border-t border-white/10">
        <div class="flex items-center gap-3">
          <div
            class="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center overflow-hidden ring-2 ring-white/20"
          >
            <img
              v-if="authStore.user?.avatar"
              :src="authStore.user.avatar"
              alt="头像"
              class="w-full h-full object-cover"
            />
            <User v-else class="w-5 h-5 text-white" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-white truncate">
              {{ authStore.user?.nickname || '用户' }}
            </p>
            <p class="text-xs text-blue-200/70 truncate">
              {{ authStore.user?.department?.name || '未分配部门' }}
              <span v-if="authStore.isAdmin" class="text-yellow-300">(管理员)</span>
              <span v-else-if="authStore.isDepartmentAdmin" class="text-green-300">(部门管理员)</span>
            </p>
          </div>
          <button
            @click="handleLogout"
            class="p-2 hover:bg-white/10 rounded-lg transition-all duration-200 group"
            title="退出登录"
          >
            <LogOut class="w-4 h-4 text-blue-200/70 group-hover:text-white transition-colors" />
          </button>
        </div>
      </div>
    </aside>

    <!-- 主内容区 -->
    <div class="flex-1 md:ml-64 flex flex-col min-h-screen">
      <!-- 顶部栏 -->
      <header class="h-16 flex items-center px-4 md:px-6 sticky top-0 z-20 header-glass">
        <!-- 移动端菜单按钮 -->
        <button
          @click="sidebarOpen = !sidebarOpen"
          class="md:hidden p-2 hover:bg-gray-100 rounded-xl mr-2 transition-colors"
        >
          <Menu class="w-6 h-6 text-gray-600" />
        </button>

        <!-- 面包屑或标题 -->
        <div class="flex-1">
          <h2 class="text-lg font-semibold" style="color: var(--color-text-primary)">{{ pageTitle }}</h2>
        </div>

        <!-- 全局搜索 -->
        <div class="mr-4 hidden md:block">
          <GlobalSearch />
        </div>

        <!-- 右侧操作区 -->
        <div class="flex items-center gap-2">
          <!-- 通知按钮 -->
          <button
            @click="showNotifications = !showNotifications"
            class="relative p-2.5 hover:bg-gray-100 rounded-xl transition-all duration-200"
          >
            <Bell class="w-5 h-5" style="color: var(--color-text-secondary)" />
            <span
              v-if="notificationStore.unreadCount > 0"
              class="absolute -top-0.5 -right-0.5 min-w-[20px] h-5 px-1.5 text-xs font-medium rounded-full flex items-center justify-center notification-badge"
            >
              {{ notificationStore.unreadCount > 9 ? '9+' : notificationStore.unreadCount }}
            </span>
          </button>

          <!-- 设置按钮 -->
          <router-link
            to="/settings"
            class="p-2.5 hover:bg-gray-100 rounded-xl transition-all duration-200"
          >
            <Settings class="w-5 h-5" style="color: var(--color-text-secondary)" />
          </router-link>
        </div>
      </header>

      <!-- 页面内容 -->
      <main class="flex-1 overflow-auto p-4 md:p-6">
        <router-view />
      </main>
    </div>

    <!-- 移动端遮罩 -->
    <Transition name="fade">
      <div
        v-if="sidebarOpen"
        @click="sidebarOpen = false"
        class="fixed inset-0 bg-black/50 backdrop-blur-sm z-20 md:hidden"
      ></div>
    </Transition>

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

<style scoped>
/* 侧边栏渐变背景 - 增强版 */
.sidebar-gradient {
  background: linear-gradient(180deg, #1e40af 0%, #1e3a8a 40%, #172554 100%);
  color: white;
  box-shadow: 4px 0 24px rgba(0, 0, 0, 0.15);
}

/* 顶部栏毛玻璃效果 - 增强版 */
.header-glass {
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(16px) saturate(180%);
  -webkit-backdrop-filter: blur(16px) saturate(180%);
  border-bottom: 1px solid rgba(226, 232, 240, 0.8);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

/* 通知角标 - 增强版 */
.notification-badge {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.5), 0 0 0 2px rgba(255, 255, 255, 0.9);
  font-weight: 600;
}

/* 过渡动画 - 优化版 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 移动端侧边栏优化 */
@media (max-width: 768px) {
  .sidebar-gradient {
    box-shadow: 8px 0 32px rgba(0, 0, 0, 0.25);
  }
}
</style>
