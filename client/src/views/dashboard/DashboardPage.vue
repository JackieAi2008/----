<template>
  <div class="space-y-6">
    <!-- 欢迎信息 -->
    <div class="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-white">
      <h1 class="text-2xl font-bold">欢迎回来，{{ authStore.user?.nickname || '用户' }}！</h1>
      <p class="text-blue-100 mt-1">今天是 {{ todayStr }}，{{ greetingText }}</p>
    </div>

    <!-- 统计卡片 -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- 今日待办 -->
      <div class="bg-white rounded-lg border border-gray-200 p-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">今日待办</p>
            <p class="text-3xl font-bold text-gray-800 mt-1">{{ dashboard.todayTasks.length }}</p>
          </div>
          <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <Calendar class="w-6 h-6 text-blue-600" />
          </div>
        </div>
        <router-link to="/calendar" class="text-sm text-blue-600 hover:text-blue-700 mt-2 inline-block">
          查看日历 →
        </router-link>
      </div>

      <!-- 逾期任务 -->
      <div class="bg-white rounded-lg border border-gray-200 p-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">逾期任务</p>
            <p class="text-3xl font-bold text-red-600 mt-1">{{ dashboard.overdueTasks.length }}</p>
          </div>
          <div class="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
            <AlertCircle class="w-6 h-6 text-red-600" />
          </div>
        </div>
        <span v-if="dashboard.overdueTasks.length > 0" class="text-sm text-red-600 mt-2 inline-block">
          需要尽快处理
        </span>
      </div>

      <!-- 本周任务 -->
      <div class="bg-white rounded-lg border border-gray-200 p-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">本周任务</p>
            <p class="text-3xl font-bold text-gray-800 mt-1">{{ dashboard.weekTasksCount }}</p>
          </div>
          <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
            <ListTodo class="w-6 h-6 text-green-600" />
          </div>
        </div>
        <span class="text-sm text-gray-500 mt-2 inline-block">
          本月完成率 {{ dashboard.monthStats.completionRate }}%
        </span>
      </div>

      <!-- 参与项目 -->
      <div class="bg-white rounded-lg border border-gray-200 p-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">参与项目</p>
            <p class="text-3xl font-bold text-gray-800 mt-1">{{ dashboard.projectCount }}</p>
          </div>
          <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
            <FolderKanban class="w-6 h-6 text-purple-600" />
          </div>
        </div>
        <router-link to="/projects" class="text-sm text-blue-600 hover:text-blue-700 mt-2 inline-block">
          查看项目 →
        </router-link>
      </div>
    </div>

    <!-- 任务列表区域 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- 今日待办 -->
      <div class="bg-white rounded-lg border border-gray-200">
        <div class="p-4 border-b border-gray-200">
          <h2 class="text-lg font-semibold text-gray-800">今日待办</h2>
        </div>
        <div class="p-4">
          <div v-if="loading" class="text-center py-8 text-gray-500">加载中...</div>
          <div v-else-if="dashboard.todayTasks.length === 0" class="text-center py-8 text-gray-500">
            <CheckCircle class="w-12 h-12 text-green-500 mx-auto mb-2" />
            <p>今日无待办任务</p>
          </div>
          <ul v-else class="space-y-3">
            <li
              v-for="task in dashboard.todayTasks"
              :key="task.id"
              class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
              @click="goToTask(task.id)"
            >
              <div
                class="w-3 h-3 rounded-full flex-shrink-0"
                :style="{ backgroundColor: task.category?.color || '#3B82F6' }"
              ></div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-800 truncate">{{ task.title }}</p>
                <p class="text-xs text-gray-500">{{ task.project?.name }}</p>
              </div>
              <span
                class="px-2 py-1 text-xs rounded-full"
                :class="getPriorityClass(task.priority)"
              >
                {{ getPriorityText(task.priority) }}
              </span>
            </li>
          </ul>
        </div>
      </div>

      <!-- 逾期任务 -->
      <div class="bg-white rounded-lg border border-gray-200">
        <div class="p-4 border-b border-gray-200">
          <h2 class="text-lg font-semibold text-gray-800">逾期任务</h2>
        </div>
        <div class="p-4">
          <div v-if="loading" class="text-center py-8 text-gray-500">加载中...</div>
          <div v-else-if="dashboard.overdueTasks.length === 0" class="text-center py-8 text-gray-500">
            <CheckCircle class="w-12 h-12 text-green-500 mx-auto mb-2" />
            <p>没有逾期任务</p>
          </div>
          <ul v-else class="space-y-3">
            <li
              v-for="task in dashboard.overdueTasks"
              :key="task.id"
              class="flex items-center gap-3 p-3 bg-red-50 rounded-lg cursor-pointer hover:bg-red-100"
              @click="goToTask(task.id)"
            >
              <div
                class="w-3 h-3 rounded-full flex-shrink-0"
                :style="{ backgroundColor: task.category?.color || '#EF4444' }"
              ></div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-800 truncate">{{ task.title }}</p>
                <p class="text-xs text-red-600">
                  截止: {{ formatDate(task.dueDate) }}
                </p>
              </div>
              <span class="text-xs text-red-600">
                {{ getOverdueDays(task.dueDate) }}天前
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- 即将到期 & 最近项目 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- 即将到期 -->
      <div class="bg-white rounded-lg border border-gray-200">
        <div class="p-4 border-b border-gray-200">
          <h2 class="text-lg font-semibold text-gray-800">即将到期（3天内）</h2>
        </div>
        <div class="p-4">
          <div v-if="dashboard.upcomingTasks.length === 0" class="text-center py-8 text-gray-500">
            <Calendar class="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p>暂无即将到期的任务</p>
          </div>
          <ul v-else class="space-y-3">
            <li
              v-for="task in dashboard.upcomingTasks"
              :key="task.id"
              class="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg cursor-pointer hover:bg-yellow-100"
              @click="goToTask(task.id)"
            >
              <div
                class="w-3 h-3 rounded-full flex-shrink-0"
                :style="{ backgroundColor: task.category?.color || '#F59E0B' }"
              ></div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-800 truncate">{{ task.title }}</p>
                <p class="text-xs text-yellow-600">
                  截止: {{ formatDate(task.dueDate) }}
                </p>
              </div>
            </li>
          </ul>
        </div>
      </div>

      <!-- 最近项目 -->
      <div class="bg-white rounded-lg border border-gray-200">
        <div class="p-4 border-b border-gray-200">
          <h2 class="text-lg font-semibold text-gray-800">最近项目</h2>
        </div>
        <div class="p-4">
          <div v-if="dashboard.recentProjects.length === 0" class="text-center py-8 text-gray-500">
            <FolderKanban class="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p>暂无项目</p>
            <router-link to="/projects" class="text-blue-600 hover:text-blue-700 mt-2 inline-block">
              创建第一个项目
            </router-link>
          </div>
          <ul v-else class="space-y-3">
            <li
              v-for="project in dashboard.recentProjects"
              :key="project.id"
              class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
              @click="goToProject(project.id)"
            >
              <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <FolderKanban class="w-5 h-5 text-white" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-800 truncate">{{ project.name }}</p>
                <p class="text-xs text-gray-500">
                  {{ project._count?.tasks || 0 }} 个任务
                </p>
              </div>
              <span
                class="px-2 py-1 text-xs rounded-full"
                :class="project.visibility === 'PUBLIC' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'"
              >
                {{ project.visibility === 'PUBLIC' ? '公开' : '私密' }}
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 中集智历 - 仪表盘页面
 */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Calendar, AlertCircle, ListTodo, FolderKanban, CheckCircle } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { getDashboard, type DashboardData } from '@/api/dashboard'
import { formatDate as formatDateUtil } from '@/utils/date'
import { devLog } from '@/utils/logger'

const router = useRouter()
const authStore = useAuthStore()

// 状态
const loading = ref(true)
const dashboard = ref<DashboardData>({
  todayTasks: [],
  overdueTasks: [],
  upcomingTasks: [],
  weekTasksCount: 0,
  monthStats: { total: 0, done: 0, completionRate: 0 },
  projectCount: 0,
  recentProjects: []
})

// 计算属性
const todayStr = computed(() => {
  const now = new Date()
  const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 ${weekDays[now.getDay()]}`
})

const greetingText = computed(() => {
  const hour = new Date().getHours()
  if (hour < 6) return '夜深了，注意休息'
  if (hour < 12) return '上午好，祝您工作顺利'
  if (hour < 14) return '中午好，记得午休'
  if (hour < 18) return '下午好，继续加油'
  return '晚上好，辛苦了'
})

// 方法
function formatDate(dateStr: string): string {
  return formatDateUtil(dateStr, 'MM月DD日 HH:mm')
}

function getOverdueDays(dateStr: string): number {
  const dueDate = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  dueDate.setHours(0, 0, 0, 0)
  return Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
}

function getPriorityClass(priority: string): string {
  switch (priority) {
    case 'HIGH': return 'bg-red-100 text-red-700'
    case 'MEDIUM': return 'bg-yellow-100 text-yellow-700'
    case 'LOW': return 'bg-gray-100 text-gray-600'
    default: return 'bg-gray-100 text-gray-600'
  }
}

function getPriorityText(priority: string): string {
  switch (priority) {
    case 'HIGH': return '高'
    case 'MEDIUM': return '中'
    case 'LOW': return '低'
    default: return '中'
  }
}

function goToTask(taskId: string) {
  router.push(`/tasks/${taskId}`)
}

function goToProject(projectId: string) {
  router.push(`/projects/${projectId}`)
}

async function fetchDashboard() {
  loading.value = true
  try {
    dashboard.value = await getDashboard()
  } catch (error) {
    devLog.error('获取仪表盘数据失败', error)
  } finally {
    loading.value = false
  }
}

// 初始化
onMounted(() => {
  fetchDashboard()
})
</script>
