<template>
  <div class="space-y-6 animate-slide-up">
    <!-- 欢迎信息 - 增强版 -->
    <div class="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 p-6 md:p-8 text-white shadow-lg">
      <!-- 装饰背景 -->
      <div class="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>
      <div class="absolute bottom-0 left-0 w-48 h-48 bg-blue-400/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4"></div>

      <div class="relative z-10">
        <h1 class="text-2xl md:text-3xl font-bold">欢迎回来，{{ authStore.user?.nickname || '用户' }}！</h1>
        <p class="text-blue-100 mt-2 text-sm md:text-base">今天是 {{ todayStr }}，{{ greetingText }}</p>
      </div>
    </div>

    <!-- 统计卡片（可展开） -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      <!-- 今日待办 -->
      <ExpandableStatCard
        ref="todayCardRef"
        title="今日待办"
        :count="dashboard.todayTasks.length"
        :icon="Calendar"
        icon-bg-class="bg-blue-100"
        icon-class="text-blue-600"
        :items="todayTaskItems"
        empty-text="今日无待办任务"
        @toggle="handleCardToggle('today')"
        @item-click="goToTask"
        @view-all="goToCalendar"
      />

      <!-- 逾期任务 -->
      <ExpandableStatCard
        ref="overdueCardRef"
        title="逾期任务"
        :count="dashboard.overdueTasks.length"
        :icon="AlertCircle"
        icon-bg-class="bg-red-100"
        icon-class="text-red-600"
        count-class="text-red-600"
        :items="overdueTaskItems"
        empty-text="没有逾期任务"
        @toggle="handleCardToggle('overdue')"
        @item-click="goToTask"
        @view-all="goToCalendar"
      />

      <!-- 本周任务 -->
      <ExpandableStatCard
        ref="weekCardRef"
        title="本周任务"
        :count="dashboard.weekTasksCount"
        :icon="ListTodo"
        icon-bg-class="bg-green-100"
        icon-class="text-green-600"
        :items="weekTaskItems"
        :empty-text="`本月完成率 ${dashboard.monthStats.completionRate}%`"
        @toggle="handleCardToggle('week')"
        @item-click="goToTask"
        @view-all="goToCalendar"
      />

      <!-- 参与项目 -->
      <ExpandableStatCard
        ref="projectCardRef"
        title="参与项目"
        :count="dashboard.projectCount"
        :icon="FolderKanban"
        icon-bg-class="bg-purple-100"
        icon-class="text-purple-600"
        :items="projectItems"
        empty-text="暂无项目"
        @toggle="handleCardToggle('project')"
        @item-click="handleProjectItemClick"
        @view-all="goToProjects"
      />
    </div>

    <!-- 即将到期 & 最近项目详情 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
      <!-- 即将到期 -->
      <div class="bg-white rounded-2xl border border-gray-100 shadow-card hover:shadow-card-hover transition-shadow duration-300">
        <div class="p-4 md:p-5 border-b border-gray-100">
          <h2 class="text-lg font-semibold text-gray-800">即将到期（3天内）</h2>
        </div>
        <div class="p-4 md:p-5">
          <div v-if="loading" class="text-center py-8 text-gray-500">加载中...</div>
          <div v-else-if="dashboard.upcomingTasks.length === 0" class="text-center py-8 text-gray-500">
            <Calendar class="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p class="text-sm">暂无即将到期的任务</p>
          </div>
          <ul v-else class="space-y-2">
            <li
              v-for="task in dashboard.upcomingTasks"
              :key="task.id"
              class="flex items-center gap-3 p-3 bg-amber-50/80 rounded-xl cursor-pointer hover:bg-amber-100/80 transition-colors duration-200"
              @click="goToTask(task.id)"
            >
              <div
                class="w-3 h-3 rounded-full flex-shrink-0 ring-2 ring-amber-200"
                :style="{ backgroundColor: task.category?.color || '#F59E0B' }"
              ></div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-800 truncate">{{ task.title }}</p>
                <p class="text-xs text-amber-600 mt-0.5">
                  截止: {{ formatDate(task.dueDate) }}
                </p>
              </div>
            </li>
          </ul>
        </div>
      </div>

      <!-- 最近项目 -->
      <div class="bg-white rounded-2xl border border-gray-100 shadow-card hover:shadow-card-hover transition-shadow duration-300">
        <div class="p-4 md:p-5 border-b border-gray-100">
          <h2 class="text-lg font-semibold text-gray-800">最近项目</h2>
        </div>
        <div class="p-4 md:p-5">
          <div v-if="loading" class="text-center py-8 text-gray-500">加载中...</div>
          <div v-else-if="dashboard.recentProjects.length === 0" class="text-center py-8 text-gray-500">
            <FolderKanban class="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p class="text-sm">暂无项目</p>
            <router-link to="/projects" class="text-blue-600 hover:text-blue-700 mt-2 inline-block text-sm font-medium">
              创建第一个项目
            </router-link>
          </div>
          <ul v-else class="space-y-2">
            <li
              v-for="project in dashboard.recentProjects"
              :key="project.id"
              class="flex items-center gap-3 p-3 bg-gray-50/80 rounded-xl cursor-pointer hover:bg-gray-100/80 transition-colors duration-200"
              @click="goToProject(project.id)"
            >
              <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                <FolderKanban class="w-5 h-5 text-white" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-800 truncate">{{ project.name }}</p>
                <p class="text-xs text-gray-500 mt-0.5">
                  {{ project._count?.tasks || 0 }} 个任务
                </p>
              </div>
              <span
                class="px-2.5 py-1 text-xs rounded-lg font-medium"
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
import { Calendar, AlertCircle, ListTodo, FolderKanban } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { getDashboard, type DashboardData } from '@/api/dashboard'
import { formatDate as formatDateUtil } from '@/utils/date'
import { devLog } from '@/utils/logger'
// Project category display removed
import ExpandableStatCard, { type StatCardItem } from '@/components/dashboard/ExpandableStatCard.vue'

const router = useRouter()
const authStore = useAuthStore()

// 卡片引用（用于手风琴效果）
const todayCardRef = ref<InstanceType<typeof ExpandableStatCard>>()
const overdueCardRef = ref<InstanceType<typeof ExpandableStatCard>>()
const weekCardRef = ref<InstanceType<typeof ExpandableStatCard>>()
const projectCardRef = ref<InstanceType<typeof ExpandableStatCard>>()

// 当前展开的卡片
const expandedCard = ref<string | null>(null)

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

// 转换为卡片项格式
const todayTaskItems = computed<StatCardItem[]>(() =>
  dashboard.value.todayTasks.map(task => ({
    id: task.id,
    title: task.title,
    subtitle: task.project?.name,
    color: task.category?.color || '#3B82F6',
    badge: getPriorityText(task.priority),
    badgeClass: getPriorityClass(task.priority)
  }))
)

const overdueTaskItems = computed<StatCardItem[]>(() =>
  dashboard.value.overdueTasks.map(task => ({
    id: task.id,
    title: task.title,
    subtitle: `截止: ${formatDate(task.dueDate)}`,
    color: task.category?.color || '#EF4444',
    badge: `${getOverdueDays(task.dueDate)}天前`,
    badgeClass: 'bg-red-100 text-red-700'
  }))
)

const weekTaskItems = computed<StatCardItem[]>(() => {
  // 本周任务数据来自 dashboard，但这里用 upcomingTasks 作为替代显示
  return dashboard.value.upcomingTasks.slice(0, 3).map(task => ({
    id: task.id,
    title: task.title,
    subtitle: task.project?.name,
    color: task.category?.color || '#22C55E'
  }))
})

const projectItems = computed<StatCardItem[]>(() =>
  dashboard.value.recentProjects.map(project => ({
    id: project.id,
    title: project.name,
    subtitle: `${project._count?.tasks || 0} 个任务`,
    badge: project.visibility === 'PUBLIC' ? '公开' : '私密',
    badgeClass: project.visibility === 'PUBLIC' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
  }))
)

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
  const map: Record<string, string> = {
    IMPORTANT_URGENT: 'bg-red-100 text-red-700',
    IMPORTANT_NOT_URGENT: 'bg-blue-100 text-blue-700',
    URGENT_NOT_IMPORTANT: 'bg-orange-100 text-orange-700',
    NOT_IMPORTANT_NOT_URGENT: 'bg-gray-100 text-gray-600'
  }
  return map[priority] || 'bg-gray-100 text-gray-600'
}

function getPriorityText(priority: string): string {
  const map: Record<string, string> = {
    IMPORTANT_URGENT: '重要且紧急',
    IMPORTANT_NOT_URGENT: '重要不紧急',
    URGENT_NOT_IMPORTANT: '紧急不重要',
    NOT_IMPORTANT_NOT_URGENT: '不重要不紧急'
  }
  return map[priority] || '重要且紧急'
}

function goToTask(taskId: string | StatCardItem) {
  const id = typeof taskId === 'string' ? taskId : taskId.id
  router.push(`/tasks/${id}`)
}

function goToProject(projectId: string) {
  router.push(`/projects/${projectId}`)
}

function goToCalendar() {
  router.push('/calendar')
}

function goToProjects() {
  router.push('/projects')
}

function handleProjectItemClick(item: StatCardItem) {
  router.push(`/projects/${item.id}`)
}

// 手风琴效果：同一时间只能展开一个卡片
function handleCardToggle(cardName: string) {
  if (expandedCard.value === cardName) {
    expandedCard.value = null
    return
  }

  // 收起其他卡片
  const cardRefs: Record<string, typeof todayCardRef> = {
    today: todayCardRef,
    overdue: overdueCardRef,
    week: weekCardRef,
    project: projectCardRef
  }

  Object.entries(cardRefs).forEach(([name, ref]) => {
    if (name !== cardName && ref.value) {
      ref.value.collapse()
    }
  })

  expandedCard.value = cardName
}

async function fetchDashboard() {
  loading.value = true
  try {
    const data = await getDashboard()
    if (data) {
      dashboard.value = data
    }
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
