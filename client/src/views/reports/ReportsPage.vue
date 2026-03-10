<template>
  <div class="reports-page p-6">
    <!-- 页面标题 -->
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-800">总结归档</h1>
      <p class="text-gray-500 mt-1">查看工作统计和生成工作总结</p>
    </div>

    <!-- 时间范围选择 -->
    <div class="bg-white rounded-lg border border-gray-200 p-4 mb-6">
      <div class="flex items-center justify-between flex-wrap gap-4">
        <div class="flex items-center gap-4">
          <span class="text-sm text-gray-600">时间范围：</span>
          <div class="flex gap-2">
            <button
              v-for="range in timeRanges"
              :key="range.value"
              @click="selectedRange = range.value"
              :class="[
                'px-4 py-2 rounded-lg text-sm transition-colors',
                selectedRange === range.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              ]"
            >
              {{ range.label }}
            </button>
          </div>
        </div>

        <!-- 导出按钮组 -->
        <div class="flex items-center gap-2">
          <span class="text-sm text-gray-600">导出：</span>
          <button
            @click="handleExportICS"
            :disabled="exporting.ics"
            class="px-3 py-1.5 text-sm bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            title="导出日历文件（可导入手机/电脑日历）"
          >
            <svg v-if="!exporting.ics" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <svg v-else class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            日历文件
          </button>
          <button
            @click="handleExportExcel"
            :disabled="exporting.excel"
            class="px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            title="导出Excel/CSV格式任务列表"
          >
            <svg v-if="!exporting.excel" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <svg v-else class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Excel表格
          </button>
          <button
            @click="handleExportPDF"
            :disabled="exporting.pdf"
            class="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            title="导出工作总结文档"
          >
            <svg v-if="!exporting.pdf" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <svg v-else class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            工作总结
          </button>
        </div>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="text-center py-12 text-gray-500">
      加载中...
    </div>

    <template v-else>
      <!-- 统计卡片 -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <!-- 总任务数 -->
        <div class="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white shadow-lg shadow-blue-200">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-blue-100 text-sm font-medium">总任务数</p>
              <p class="text-4xl font-bold mt-2">{{ stats.total }}</p>
              <p class="text-blue-200 text-xs mt-1">选定时间范围内</p>
            </div>
            <div class="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
              <ClipboardList class="w-7 h-7" />
            </div>
          </div>
        </div>

        <!-- 已完成 -->
        <div class="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-5 text-white shadow-lg shadow-green-200">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-green-100 text-sm font-medium">已完成</p>
              <p class="text-4xl font-bold mt-2">{{ stats.done }}</p>
              <p class="text-green-200 text-xs mt-1">完成率 {{ completionRate }}%</p>
            </div>
            <div class="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
              <CheckCircle class="w-7 h-7" />
            </div>
          </div>
        </div>

        <!-- 进行中 -->
        <div class="bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl p-5 text-white shadow-lg shadow-amber-200">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-amber-100 text-sm font-medium">进行中</p>
              <p class="text-4xl font-bold mt-2">{{ stats.inProgress }}</p>
              <p class="text-amber-200 text-xs mt-1">正在处理</p>
            </div>
            <div class="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
              <Clock class="w-7 h-7" />
            </div>
          </div>
        </div>

        <!-- 逾期任务 -->
        <div class="bg-gradient-to-br from-red-500 to-rose-600 rounded-xl p-5 text-white shadow-lg shadow-red-200">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-red-100 text-sm font-medium">逾期任务</p>
              <p class="text-4xl font-bold mt-2">{{ stats.overdue }}</p>
              <p class="text-red-200 text-xs mt-1">需要关注</p>
            </div>
            <div class="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
              <AlertTriangle class="w-7 h-7" />
            </div>
          </div>
        </div>
      </div>

      <!-- 任务状态分布 -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div class="bg-white rounded-lg border border-gray-200 p-6">
          <h3 class="text-lg font-semibold text-gray-800 mb-4">任务状态分布</h3>
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <div class="w-3 h-3 rounded-full bg-gray-400"></div>
                <span class="text-sm text-gray-600">待办</span>
              </div>
              <div class="flex items-center gap-2">
                <div class="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    class="h-full bg-gray-400 rounded-full"
                    :style="{ width: getStatusPercent('TODO') + '%' }"
                  ></div>
                </div>
                <span class="text-sm text-gray-600 w-12 text-right">{{ statusCounts.TODO || 0 }}</span>
              </div>
            </div>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <div class="w-3 h-3 rounded-full bg-blue-500"></div>
                <span class="text-sm text-gray-600">进行中</span>
              </div>
              <div class="flex items-center gap-2">
                <div class="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    class="h-full bg-blue-500 rounded-full"
                    :style="{ width: getStatusPercent('IN_PROGRESS') + '%' }"
                  ></div>
                </div>
                <span class="text-sm text-gray-600 w-12 text-right">{{ statusCounts.IN_PROGRESS || 0 }}</span>
              </div>
            </div>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <div class="w-3 h-3 rounded-full bg-green-500"></div>
                <span class="text-sm text-gray-600">已完成</span>
              </div>
              <div class="flex items-center gap-2">
                <div class="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    class="h-full bg-green-500 rounded-full"
                    :style="{ width: getStatusPercent('DONE') + '%' }"
                  ></div>
                </div>
                <span class="text-sm text-gray-600 w-12 text-right">{{ statusCounts.DONE || 0 }}</span>
              </div>
            </div>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <div class="w-3 h-3 rounded-full bg-red-400"></div>
                <span class="text-sm text-gray-600">已取消</span>
              </div>
              <div class="flex items-center gap-2">
                <div class="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    class="h-full bg-red-400 rounded-full"
                    :style="{ width: getStatusPercent('CANCELLED') + '%' }"
                  ></div>
                </div>
                <span class="text-sm text-gray-600 w-12 text-right">{{ statusCounts.CANCELLED || 0 }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 项目参与统计 -->
        <div class="bg-white rounded-lg border border-gray-200 p-6">
          <h3 class="text-lg font-semibold text-gray-800 mb-4">项目参与统计</h3>
          <div v-if="projectStats.length === 0" class="text-center py-8 text-gray-500">
            暂无项目数据
          </div>
          <div v-else class="space-y-3">
            <div
              v-for="project in projectStats"
              :key="project.projectId"
              class="flex items-center justify-between"
            >
              <span class="text-sm text-gray-600 truncate" :title="project.projectName">
                {{ project.projectName }}
              </span>
              <div class="flex items-center gap-2">
                <div class="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    class="h-full bg-blue-500 rounded-full"
                    :style="{ width: getProjectPercent(project.count) + '%' }"
                  ></div>
                </div>
                <span class="text-sm text-gray-600 w-8 text-right">{{ project.count }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 完成趋势 -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <TrendingUp class="w-5 h-5 text-green-600" />
            完成趋势
          </h3>
          <div class="flex items-center gap-4 text-sm">
            <span class="flex items-center gap-1.5">
              <div class="w-3 h-3 rounded-full bg-gradient-to-t from-blue-500 to-blue-400"></div>
              <span class="text-gray-500">完成任务数</span>
            </span>
          </div>
        </div>

        <div v-if="trendData.length === 0 || trendData.every(d => d.count === 0)" class="text-center py-12">
          <BarChart3 class="w-16 h-16 text-gray-200 mx-auto mb-3" />
          <p class="text-gray-400">暂无趋势数据</p>
          <p class="text-gray-300 text-sm mt-1">完成任务后将在此显示趋势</p>
        </div>

        <div v-else class="relative">
          <!-- Y轴刻度 -->
          <div class="absolute left-0 top-0 bottom-8 w-10 flex flex-col justify-between text-xs text-gray-400">
            <span>{{ maxTrendValue }}</span>
            <span>{{ Math.round(maxTrendValue / 2) }}</span>
            <span>0</span>
          </div>

          <!-- 图表区域 -->
          <div class="ml-12">
            <!-- 网格线 -->
            <div class="absolute left-12 right-0 top-0 h-40 flex flex-col justify-between pointer-events-none">
              <div class="border-b border-gray-100"></div>
              <div class="border-b border-gray-100"></div>
              <div class="border-b border-gray-100"></div>
            </div>

            <!-- 柱状图 -->
            <div class="h-40 flex items-end justify-around gap-2 relative">
              <div
                v-for="(day, index) in trendData"
                :key="index"
                class="flex flex-col items-center group flex-1"
              >
                <!-- 数值提示 -->
                <div class="opacity-0 group-hover:opacity-100 transition-opacity mb-1 bg-gray-800 text-white text-xs px-2 py-1 rounded">
                  {{ day.count }} 项
                </div>
                <!-- 柱子 -->
                <div
                  class="w-full max-w-[40px] rounded-t-lg transition-all duration-300 group-hover:opacity-80 relative overflow-hidden"
                  :class="day.count > 0 ? 'bg-gradient-to-t from-blue-600 to-blue-400 shadow-md shadow-blue-200' : 'bg-gray-200'"
                  :style="{ height: getBarHeight(day.count) + 'px' }"
                >
                  <div v-if="day.count > 0" class="absolute top-0 left-0 right-0 h-1 bg-white/30 rounded-t-lg"></div>
                </div>
                <span class="text-xs text-gray-500 mt-2 font-medium">{{ day.label }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 工作总结生成 -->
      <div class="bg-white rounded-lg border border-gray-200 p-6">
        <h3 class="text-lg font-semibold text-gray-800 mb-4">工作总结</h3>
        <div class="mb-4">
          <label class="block text-sm text-gray-600 mb-2">总结类型：</label>
          <select
            v-model="summaryType"
            class="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="weekly">周总结</option>
            <option value="monthly">月总结</option>
            <option value="quarterly">季度总结</option>
          </select>
        </div>
        <div class="flex gap-2">
          <button
            @click="generateSummary"
            :disabled="generating"
            class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ generating ? '生成中...' : '生成总结' }}
          </button>
          <button
            v-if="summary"
            @click="downloadCurrentSummary"
            class="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            下载总结
          </button>
        </div>

        <!-- 生成的总结 -->
        <div v-if="summary" class="mt-6 p-4 bg-gray-50 rounded-lg">
          <div class="flex items-center justify-between mb-3">
            <h4 class="font-medium text-gray-800">{{ summary.title }}</h4>
            <button
              @click="copySummary"
              class="text-sm text-blue-600 hover:text-blue-700"
            >
              复制
            </button>
          </div>
          <div class="text-sm text-gray-600 whitespace-pre-wrap">{{ summary.content }}</div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
/**
 * 中集智历 - 总结归档页面
 */
import { ref, computed, onMounted, watch, reactive } from 'vue'
import {
  ClipboardList,
  CheckCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  BarChart3
} from 'lucide-vue-next'
import { getDashboard, getWorkStats } from '@/api/dashboard'
import { downloadICS, downloadExcel, downloadPDF } from '@/api/export'
import { useToast } from '@/composables/useToast'
import { devLog } from '@/utils/logger'

const { toast } = useToast()

// 时间范围选项
const timeRanges = [
  { label: '本周', value: 'week' },
  { label: '本月', value: 'month' },
  { label: '本季度', value: 'quarter' },
  { label: '本年', value: 'year' }
]

const selectedRange = ref('month')
const loading = ref(false)
const generating = ref(false)
const summaryType = ref<'weekly' | 'monthly' | 'quarterly'>('weekly')
const summary = ref<{ title: string; content: string } | null>(null)

// 导出状态
const exporting = reactive({
  ics: false,
  excel: false,
  pdf: false
})

// 统计数据
const stats = ref({
  total: 0,
  done: 0,
  inProgress: 0,
  overdue: 0
})

const statusCounts = ref<Record<string, number>>({
  TODO: 0,
  IN_PROGRESS: 0,
  DONE: 0,
  CANCELLED: 0
})

const projectStats = ref<Array<{ projectId: string; projectName: string; count: number }>>([])

const trendData = ref<Array<{ label: string; count: number }>>([])

// 计算属性
const completionRate = computed(() => {
  if (stats.value.total === 0) return 0
  return Math.round((stats.value.done / stats.value.total) * 100)
})

const maxTrendValue = computed(() => {
  const max = Math.max(...trendData.value.map(d => d.count), 1)
  return Math.ceil(max / 5) * 5
})

// 计算状态百分比
function getStatusPercent(status: string): number {
  const total = stats.value.total || 1
  const count = statusCounts.value[status] || 0
  return Math.round((count / total) * 100)
}

// 计算项目百分比
function getProjectPercent(count: number): number {
  const max = Math.max(...projectStats.value.map(p => p.count), 1)
  return Math.round((count / max) * 100)
}

// 计算柱状图高度
function getBarHeight(count: number): number {
  if (count === 0) return 4
  const max = maxTrendValue.value || 1
  return Math.max(4, Math.round((count / max) * 140))
}

// 获取日期范围
function getDateRange(): { startDate: string; endDate: string } {
  const now = new Date()
  const end = new Date(now)
  let start = new Date(now)

  switch (selectedRange.value) {
    case 'week':
      start.setDate(now.getDate() - 7)
      break
    case 'month':
      start.setMonth(now.getMonth() - 1)
      break
    case 'quarter':
      start.setMonth(now.getMonth() - 3)
      break
    case 'year':
      start.setFullYear(now.getFullYear() - 1)
      break
  }

  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0]
  }
}

// 加载数据
async function loadData() {
  loading.value = true
  try {
    const range = getDateRange()

    // 并行获取数据
    const [dashboardData, workStatsData] = await Promise.all([
      getDashboard(),
      getWorkStats(range)
    ])

    // 设置统计数据
    stats.value = {
      total: dashboardData.monthStats.total,
      done: dashboardData.monthStats.done,
      inProgress: 0,
      overdue: dashboardData.overdueTasks.length
    }

    // 设置状态统计
    const statusData = workStatsData.statusStats
    statusCounts.value = {
      TODO: statusData.find(s => s.status === 'TODO')?._count || 0,
      IN_PROGRESS: statusData.find(s => s.status === 'IN_PROGRESS')?._count || 0,
      DONE: statusData.find(s => s.status === 'DONE')?._count || 0,
      CANCELLED: statusData.find(s => s.status === 'CANCELLED')?._count || 0
    }

    // 更新总数
    stats.value.total = Object.values(statusCounts.value).reduce((a, b) => a + b, 0)
    stats.value.inProgress = statusCounts.value.IN_PROGRESS

    // 设置项目统计
    projectStats.value = workStatsData.projectStats

    // 生成趋势数据（模拟最近7天）
    generateTrendData()
  } catch (error) {
    devLog.error('加载数据失败:', error)
    toast('加载数据失败', 'error')
  } finally {
    loading.value = false
  }
}

// 生成趋势数据
function generateTrendData() {
  const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  const today = new Date().getDay()
  const startIndex = today === 0 ? 6 : today - 1

  trendData.value = days.map((day) => {
    // 模拟数据，实际应该从API获取
    const count = Math.floor(Math.random() * (statusCounts.value.DONE / 7 || 3)) + 1
    return {
      label: day,
      count
    }
  })

  // 调整顺序，让今天在最后
  const sorted = []
  for (let i = 0; i < 7; i++) {
    sorted.push(trendData.value[(startIndex + i) % 7])
  }
  trendData.value = sorted
}

// 生成工作总结
async function generateSummary() {
  generating.value = true
  try {
    // 模拟生成总结
    await new Promise(resolve => setTimeout(resolve, 1000))

    const now = new Date()
    let title = ''
    let periodText = ''

    switch (summaryType.value) {
      case 'weekly':
        title = `周总结 (${now.toLocaleDateString()})`
        periodText = '本周'
        break
      case 'monthly':
        title = `月总结 (${now.getFullYear()}年${now.getMonth() + 1}月)`
        periodText = '本月'
        break
      case 'quarterly':
        const quarter = Math.floor(now.getMonth() / 3) + 1
        title = `季度总结 (${now.getFullYear()}年第${quarter}季度)`
        periodText = '本季度'
        break
    }

    const content = `【工作概述】
在${periodText}的工作中，共完成了 ${stats.value.done} 项任务，目前有 ${stats.value.inProgress} 项任务正在进行中。

【完成情况】
- 待办任务：${statusCounts.value.TODO} 项
- 进行中：${statusCounts.value.IN_PROGRESS} 项
- 已完成：${statusCounts.value.DONE} 项
- 完成率：${Math.round((stats.value.done / stats.value.total) * 100) || 0}%

【项目参与】
${projectStats.value.slice(0, 3).map(p => `- ${p.projectName}：${p.count} 项任务`).join('\n')}

【需要关注】
- 逾期任务：${stats.value.overdue} 项

【下一步计划】
1. 优先处理逾期任务
2. 推进进行中的任务
3. 按计划完成待办任务
`
    summary.value = { title, content }
    toast('总结生成成功', 'success')
  } catch (error) {
    devLog.error('生成总结失败:', error)
    toast('生成总结失败', 'error')
  } finally {
    generating.value = false
  }
}

// 复制总结
async function copySummary() {
  if (!summary.value) return

  try {
    await navigator.clipboard.writeText(summary.value.content)
    toast('已复制到剪贴板', 'success')
  } catch (error) {
    devLog.error('复制失败:', error)
    toast('复制失败', 'error')
  }
}

// 下载当前总结
function downloadCurrentSummary() {
  if (!summary.value) return

  const blob = new Blob([summary.value.content], { type: 'text/plain;charset=utf-8' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${summary.value.title.replace(/[\/\s]/g, '-')}.txt`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)

  toast('总结已下载', 'success')
}

// 导出ICS日历
async function handleExportICS() {
  exporting.ics = true
  try {
    const range = getDateRange()
    await downloadICS(range)
    toast('ICS日历导出成功', 'success')
  } catch (error) {
    devLog.error('导出ICS失败:', error)
    toast('导出ICS失败', 'error')
  } finally {
    exporting.ics = false
  }
}

// 导出Excel
async function handleExportExcel() {
  exporting.excel = true
  try {
    const range = getDateRange()
    await downloadExcel(range)
    toast('Excel导出成功', 'success')
  } catch (error) {
    devLog.error('导出Excel失败:', error)
    toast('导出Excel失败', 'error')
  } finally {
    exporting.excel = false
  }
}

// 导出PDF总结
async function handleExportPDF() {
  exporting.pdf = true
  try {
    const range = getDateRange()
    await downloadPDF({
      ...range,
      summaryType: summaryType.value
    })
    toast('PDF总结导出成功', 'success')
  } catch (error) {
    devLog.error('导出PDF失败:', error)
    toast('导出PDF失败', 'error')
  } finally {
    exporting.pdf = false
  }
}

// 监听时间范围变化
watch(selectedRange, () => {
  loadData()
})

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.reports-page {
  max-width: 1200px;
  margin: 0 auto;
}
</style>
