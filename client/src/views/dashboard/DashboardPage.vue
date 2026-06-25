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

    <!-- 年度看板 (R0 阶段 2) -->
    <section>
      <div class="flex items-center justify-between mb-3">
        <div>
          <h2 class="text-lg md:text-xl font-semibold text-gray-800">年度看板</h2>
          <p class="text-xs text-gray-500 mt-0.5">
            自然年 (1/1 ~ 12/31) · 我参与/可见
            <span v-if="yearly.truncated" class="text-amber-600 ml-1">· 已达上限 10000,显示分桶可能不全</span>
          </p>
        </div>
        <div class="flex items-center gap-2">
          <label for="year-switch" class="text-sm text-gray-500">年份</label>
          <select
            id="year-switch"
            v-model.number="selectedYear"
            class="px-3 py-1.5 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            :disabled="yearlyLoading"
            @change="onYearChange"
          >
            <option v-for="y in yearOptions" :key="y" :value="y">{{ y }} 年</option>
          </select>
        </div>
      </div>

      <!-- 4 张年度大卡 -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatisticsCard
          :icon="BarChart3"
          :value="yearly.yearlyTotal"
          label="年度总任务"
          color="blue"
        />
        <StatisticsCard
          :icon="Clock"
          :value="yearly.yearlyTodo"
          label="待办"
          color="yellow"
        />
        <StatisticsCard
          :icon="AlertCircle"
          :value="yearly.yearlyOverdue"
          label="逾期"
          color="red"
        />
        <StatisticsCard
          :icon="CheckCircle2"
          :value="yearly.yearlyDone"
          label="已完成"
          color="green"
        />
      </div>

      <!-- 12 月迷你柱状图 -->
      <div class="mt-3 bg-white rounded-2xl border border-gray-100 shadow-card p-4 md:p-5">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-semibold text-gray-700">月度分布 (按截止月)</h3>
          <p v-if="!yearlyLoading" class="text-xs text-gray-500">total: {{ yearly.yearlyTotal }} · done: {{ yearly.yearlyDone }}</p>
        </div>
        <div v-if="yearlyLoading" class="text-center py-6 text-gray-500 text-sm">加载中...</div>
        <div v-else class="flex items-end gap-1.5 md:gap-2 h-24">
          <div
            v-for="m in yearly.byMonth"
            :key="m.month"
            class="flex-1 flex flex-col items-center gap-1 group"
            :title="`${m.month}月 · total ${m.total} · done ${m.done}`"
          >
            <div class="w-full h-full flex flex-col justify-end relative">
              <div
                v-if="m.total > 0"
                class="w-full rounded-t bg-gradient-to-t from-blue-500 to-blue-300 transition-all"
                :style="{ height: barHeight(m.total) + '%' }"
              ></div>
              <div
                v-if="m.total > 0"
                class="absolute bottom-0 w-full rounded-t bg-gradient-to-t from-green-600 to-green-400"
                :style="{ height: barHeight(m.done) + '%' }"
              ></div>
            </div>
            <span class="text-[10px] text-gray-500">{{ m.month }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- 次级快捷入口 (今日/逾期/本周/项目) - 可折叠 -->
    <section>
      <button
        type="button"
        class="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
        @click="showSecondary = !showSecondary"
      >
        <ChevronRight v-if="!showSecondary" class="w-4 h-4" />
        <ChevronDown v-else class="w-4 h-4" />
        <span>今日 / 逾期 / 本周 / 参与项目</span>
        <span class="text-xs text-gray-400">({{ showSecondary ? '折叠' : '展开' }})</span>
      </button>

      <div v-if="showSecondary" class="mt-3 space-y-6">
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
    </section>
  </div>
</template>

<script setup lang="ts">
/**
 * 中集智历 - 仪表盘页面
 */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  Calendar,
  AlertCircle,
  ListTodo,
  FolderKanban,
  BarChart3,
  Clock,
  CheckCircle2,
  ChevronRight,
  ChevronDown
} from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import {
  getDashboard,
  getYearlyDashboard,
  type DashboardData,
  type YearlyDashboard
} from '@/api/dashboard'
import { formatDate as formatDateUtil } from '@/utils/date'
import { devLog } from '@/utils/logger'
// Project category display removed
import ExpandableStatCard, { type StatCardItem } from '@/components/dashboard/ExpandableStatCard.vue'
import StatisticsCard from '@/components/StatisticsCard.vue'

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

// ====== R0 阶段 2: 年度看板 ======
const yearOptions = (() => {
  // 当前年 + 前后两年 (默认覆盖 2024..2028 视当年决定)
  const now = new Date().getFullYear()
  return [now - 2, now - 1, now, now + 1, now + 2]
})()
const selectedYear = ref<number>(new Date().getFullYear())
const yearlyLoading = ref(false)
const yearly = ref<YearlyDashboard>({
  year: selectedYear.value,
  yearlyTotal: 0,
  yearlyTodo: 0,
  yearlyOverdue: 0,
  yearlyDone: 0,
  byMonth: Array.from({ length: 12 }, (_, i) => ({ month: i + 1, total: 0, done: 0 })),
  truncated: false
})
const showSecondary = ref(false) // 次级快捷入口默认折叠

function onYearChange() {
  fetchYearly()
}

function barHeight(value: number): number {
  // 月度柱图高度百分比,按最大值归一化
  const max = Math.max(1, ...yearly.value.byMonth.map(m => m.total))
  return Math.round((value / max) * 100)
}

async function fetchYearly() {
  yearlyLoading.value = true
  try {
    const data = await getYearlyDashboard(selectedYear.value)
    if (data) {
      yearly.value = data
    }
  } catch (error) {
    devLog.error('获取年度看板失败', error)
  } finally {
    yearlyLoading.value = false
  }
}

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
  fetchYearly()
})
</script>
