<template>
  <div class="space-y-6">
    <!-- 页面标题 -->
    <div class="flex items-center gap-4">
      <router-link
        to="/my-department"
        class="p-2 hover:bg-gray-100 rounded-lg"
      >
        <ArrowLeft class="w-5 h-5" />
      </router-link>
      <div>
        <h1 class="text-2xl font-bold text-gray-900">
          {{ memberDetail?.user.nickname }} 的任务日历
        </h1>
        <p class="text-gray-500 text-sm">{{ memberDetail?.user.email }}</p>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-12">
      <Loader2 class="w-8 h-8 animate-spin text-blue-600" />
    </div>

    <template v-else-if="memberDetail">
      <!-- 日历视图 -->
      <div class="bg-white rounded-lg border border-gray-200 p-6">
        <div class="flex justify-between items-center mb-4">
          <button @click="prevMonth" class="p-2 hover:bg-gray-100 rounded-lg">
            <ChevronLeft class="w-5 h-5" />
          </button>
          <h2 class="text-lg font-semibold">
            {{ currentYear }}年{{ currentMonth + 1 }}月
          </h2>
          <button @click="nextMonth" class="p-2 hover:bg-gray-100 rounded-lg">
            <ChevronRight class="w-5 h-5" />
          </button>
        </div>

        <!-- 星期标题 -->
        <div class="grid grid-cols-7 gap-1 mb-2">
          <div v-for="day in ['日', '一', '二', '三', '四', '五', '六']" :key="day" class="text-center text-sm text-gray-500 py-2">
            {{ day }}
          </div>
        </div>

        <!-- 日期格子 -->
        <div class="grid grid-cols-7 gap-1">
          <div
            v-for="(date, index) in calendarDates"
            :key="index"
            class="min-h-[80px] border border-gray-100 rounded p-1 cursor-pointer"
            :class="{
              'bg-gray-50': !date.isCurrentMonth,
              'bg-blue-50 ring-2 ring-blue-500': date.fullDate === selectedDate
            }"
            @click="selectDate(date)"
          >
            <div
              class="text-sm"
              :class="{
                'text-gray-400': !date.isCurrentMonth,
                'text-blue-600 font-bold': date.isToday,
                'text-red-600': date.hasOverdue && date.isCurrentMonth
              }"
            >
              {{ date.day }}
            </div>
            <div v-if="date.taskCount > 0" class="mt-1">
              <div
                class="text-xs px-1.5 py-0.5 rounded"
                :class="date.hasOverdue ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'"
              >
                {{ date.taskCount }}个任务
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 选中日期的任务列表 -->
      <div v-if="selectedDateTasks.length > 0" class="bg-white rounded-lg border border-gray-200">
        <div class="p-4 border-b border-gray-200">
          <h3 class="text-lg font-semibold">{{ formatSelectedDate }} 的任务</h3>
        </div>
        <div class="divide-y divide-gray-200">
          <router-link
            v-for="task in selectedDateTasks"
            :key="task.id"
            :to="`/projects/${task.project?.id}/tasks/${task.id}`"
            class="p-4 hover:bg-gray-50 flex items-center justify-between"
          >
            <div>
              <p class="font-medium text-gray-900">{{ task.title }}</p>
              <p class="text-sm text-gray-500">{{ task.project?.name || '未知项目' }}</p>
            </div>
            <span
              class="px-2 py-1 text-xs rounded-full"
              :class="getStatusClass(task.status)"
            >
              {{ getStatusText(task.status) }}
            </span>
          </router-link>
        </div>
      </div>

      <!-- 无任务提示 -->
      <div v-else-if="selectedDate" class="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
        {{ formatSelectedDate }} 没有任务
      </div>

      <!-- 所有任务列表 -->
      <div v-if="memberDetail.tasks.length > 0" class="bg-white rounded-lg border border-gray-200">
        <div class="p-4 border-b border-gray-200">
          <h3 class="text-lg font-semibold">所有任务 ({{ memberDetail.tasks.length }})</h3>
        </div>
        <div class="divide-y divide-gray-200">
          <router-link
            v-for="task in memberDetail.tasks"
            :key="task.id"
            :to="`/projects/${task.project?.id}/tasks/${task.id}`"
            class="p-4 hover:bg-gray-50 flex items-center justify-between"
          >
            <div class="flex items-center gap-3">
              <div
                :class="[
                  'w-2 h-2 rounded-full',
                  task.status === 'DONE' ? 'bg-green-500' :
                  task.status === 'IN_PROGRESS' ? 'bg-yellow-500' :
                  task.status === 'CANCELLED' ? 'bg-gray-400' : 'bg-blue-500'
                ]"
              />
              <div>
                <p class="font-medium text-gray-900">{{ task.title }}</p>
                <p class="text-sm text-gray-500">
                  {{ task.project?.name || '未知项目' }} ·
                  <span :class="isOverdue(task) ? 'text-red-600' : ''">
                    {{ task.dueDate ? formatDate(task.dueDate) : '无截止日期' }}
                  </span>
                </p>
              </div>
            </div>
            <span
              class="px-2 py-1 text-xs rounded-full"
              :class="getStatusClass(task.status)"
            >
              {{ getStatusText(task.status) }}
            </span>
          </router-link>
        </div>
      </div>
    </template>

    <div v-else class="text-center py-12">
      <p class="text-gray-500">无法获取成员信息</p>
      <router-link to="/my-department" class="text-blue-600 hover:text-blue-700 mt-2 inline-block">
        返回部门页面
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2 } from 'lucide-vue-next'
import { getMemberDetail, type MemberDetail } from '@/api/dashboard'
import { useDepartmentStore } from '@/stores/department'

const route = useRoute()
const departmentStore = useDepartmentStore()
const loading = ref(true)
const memberDetail = ref<MemberDetail | null>(null)

const currentYear = ref(new Date().getFullYear())
const currentMonth = ref(new Date().getMonth())
const selectedDate = ref('')

const userId = computed(() => route.params.userId as string)
const departmentId = computed(() => departmentStore.myDepartment?.id || '')

// 获取日历日期数据
const calendarDates = computed(() => {
  const dates: Array<{
    day: number
    isCurrentMonth: boolean
    isToday: boolean
    taskCount: number
    hasOverdue: boolean
    fullDate: string
  }> = []

  const firstDay = new Date(currentYear.value, currentMonth.value, 1)
  const lastDay = new Date(currentYear.value, currentMonth.value + 1, 0)
  const startPadding = firstDay.getDay()

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // 上个月的填充
  for (let i = startPadding - 1; i >= 0; i--) {
    const date = new Date(currentYear.value, currentMonth.value, -i)
    const dateStr = formatDateStr(date)
    const calendarItem = memberDetail.value?.calendar.find(c => c.date === dateStr)
    dates.push({
      day: date.getDate(),
      isCurrentMonth: false,
      isToday: false,
      taskCount: calendarItem?.taskCount || 0,
      hasOverdue: calendarItem?.tasks.some(t => t.status !== 'DONE' && new Date(t.dueDate) < today) || false,
      fullDate: dateStr
    })
  }

  // 当前月
  for (let i = 1; i <= lastDay.getDate(); i++) {
    const date = new Date(currentYear.value, currentMonth.value, i)
    const dateStr = formatDateStr(date)
    const calendarItem = memberDetail.value?.calendar.find(c => c.date === dateStr)
    const isToday = date.toDateString() === today.toDateString()
    dates.push({
      day: i,
      isCurrentMonth: true,
      isToday,
      taskCount: calendarItem?.taskCount || 0,
      hasOverdue: calendarItem?.tasks.some(t => t.status !== 'DONE' && new Date(t.dueDate) < today) || false,
      fullDate: dateStr
    })
  }

  // 下个月的填充
  const remaining = 42 - dates.length
  for (let i = 1; i <= remaining; i++) {
    const date = new Date(currentYear.value, currentMonth.value + 1, i)
    const dateStr = formatDateStr(date)
    const calendarItem = memberDetail.value?.calendar.find(c => c.date === dateStr)
    dates.push({
      day: i,
      isCurrentMonth: false,
      isToday: false,
      taskCount: calendarItem?.taskCount || 0,
      hasOverdue: calendarItem?.tasks.some(t => t.status !== 'DONE' && new Date(t.dueDate) < today) || false,
      fullDate: dateStr
    })
  }

  return dates
})

// 选中日期的任务
const selectedDateTasks = computed(() => {
  if (!selectedDate.value || !memberDetail.value) return []
  const calendarItem = memberDetail.value.calendar.find(c => c.date === selectedDate.value)
  return calendarItem?.tasks || []
})

// 格式化选中日期显示
const formatSelectedDate = computed(() => {
  if (!selectedDate.value) return ''
  const date = new Date(selectedDate.value)
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
})

function formatDateStr(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '无截止日期'
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

function isOverdue(task: { status: string; dueDate: string }): boolean {
  if (task.status === 'DONE' || task.status === 'CANCELLED') return false
  if (!task.dueDate) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return new Date(task.dueDate) < today
}

function prevMonth() {
  if (currentMonth.value === 0) {
    currentMonth.value = 11
    currentYear.value--
  } else {
    currentMonth.value--
  }
}

function nextMonth() {
  if (currentMonth.value === 11) {
    currentMonth.value = 0
    currentYear.value++
  } else {
    currentMonth.value++
  }
}

function selectDate(date: { fullDate: string; taskCount: number }) {
  if (date.taskCount > 0) {
    selectedDate.value = date.fullDate
  } else {
    selectedDate.value = ''
  }
}

function getStatusClass(status: string): string {
  const classes: Record<string, string> = {
    TODO: 'bg-gray-100 text-gray-700',
    IN_PROGRESS: 'bg-blue-100 text-blue-700',
    DONE: 'bg-green-100 text-green-700',
    CANCELLED: 'bg-red-100 text-red-700'
  }
  return classes[status] || 'bg-gray-100 text-gray-700'
}

function getStatusText(status: string): string {
  const texts: Record<string, string> = {
    TODO: '待办',
    IN_PROGRESS: '进行中',
    DONE: '已完成',
    CANCELLED: '已取消'
  }
  return texts[status] || status
}

onMounted(async () => {
  try {
    // 确保部门信息已加载
    if (!departmentStore.myDepartment) {
      await departmentStore.fetchMyDepartment()
    }

    if (departmentId.value) {
      const result = await getMemberDetail(departmentId.value, userId.value)
      memberDetail.value = result ?? null
    }
  } catch (e) {
    console.error('获取成员详情失败:', e)
  } finally {
    loading.value = false
  }
})
</script>
