<template>
  <div class="reports-page p-6 max-w-6xl mx-auto">
    <!-- 页面标题 -->
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-800">总结归档</h1>
      <p class="text-gray-500 mt-1">查看工作统计和生成AI智能工作总结</p>
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
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="text-center py-12 text-gray-500">
      <div class="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
      加载中...
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="text-center py-12">
      <div class="text-red-500 mb-4">{{ error }}</div>
      <button @click="loadData" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
        重新加载
      </button>
    </div>

    <!-- 统计内容 -->
    <template v-else>
      <!-- 统计卡片 -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <!-- 总任务数 -->
        <div class="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white">
          <p class="text-blue-100 text-sm font-medium">总任务数</p>
          <p class="text-4xl font-bold mt-2">{{ stats.total }}</p>
        </div>

        <!-- 已完成 -->
        <div class="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-5 text-white">
          <p class="text-green-100 text-sm font-medium">已完成</p>
          <p class="text-4xl font-bold mt-2">{{ stats.done }}</p>
          <p class="text-green-200 text-xs mt-1">完成率 {{ completionRate }}%</p>
        </div>

        <!-- 进行中 -->
        <div class="bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl p-5 text-white">
          <p class="text-amber-100 text-sm font-medium">进行中</p>
          <p class="text-4xl font-bold mt-2">{{ stats.inProgress }}</p>
        </div>

        <!-- 待办 -->
        <div class="bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl p-5 text-white">
          <p class="text-gray-100 text-sm font-medium">待办</p>
          <p class="text-4xl font-bold mt-2">{{ stats.todo }}</p>
        </div>
      </div>

      <!-- 任务状态分布 & 项目参与 -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div class="bg-white rounded-lg border border-gray-200 p-6">
          <h3 class="text-lg font-semibold text-gray-800 mb-4">任务状态分布</h3>
          <div class="space-y-3">
            <div v-for="item in statusList" :key="item.status" class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <div class="w-3 h-3 rounded-full" :class="item.color"></div>
                <span class="text-sm text-gray-600">{{ item.label }}</span>
              </div>
              <div class="flex items-center gap-2">
                <div class="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div class="h-full rounded-full" :class="item.color" :style="{ width: getPercent(statusCounts[item.status]) + '%' }"></div>
                </div>
                <span class="text-sm text-gray-600 w-12 text-right">{{ statusCounts[item.status] }}</span>
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
            <div v-for="project in projectStats" :key="project.projectId" class="flex items-center justify-between">
              <span class="text-sm text-gray-600 truncate" :title="project.projectName">
                {{ project.projectName }}
              </span>
              <span class="text-sm text-gray-600">{{ project.count }} 项任务</span>
            </div>
          </div>
        </div>
      </div>

      <!-- AI 智能总结 -->
      <div class="bg-white rounded-lg border border-gray-200 p-6">
        <div class="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div class="flex items-center gap-2">
            <svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            <h3 class="text-lg font-semibold text-gray-800">AI 智能总结</h3>
          </div>
          <div class="flex items-center gap-3">
            <select v-model="summaryType" class="px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="weekly">周总结</option>
              <option value="monthly">月总结</option>
              <option value="quarterly">季度总结</option>
              <option value="yearly">年度总结</option>
            </select>
            <button
              @click="handleGenerateSummary"
              :disabled="aiLoading"
              class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              {{ aiLoading ? '生成中...' : '生成总结' }}
            </button>
          </div>
        </div>

        <!-- 加载中：骨架屏 -->
        <div v-if="aiLoading" class="py-8">
          <div class="flex items-center gap-3 mb-6">
            <div class="animate-spin w-6 h-6 border-3 border-blue-500 border-t-transparent rounded-full"></div>
            <div>
              <p class="text-gray-700 font-medium">正在分析工作数据...</p>
              <p class="text-gray-400 text-sm">AI 正在生成您的{{ summaryTypeLabel }}总结，请稍候</p>
            </div>
          </div>
          <!-- 骨架屏 -->
          <div class="space-y-6">
            <div>
              <div class="h-4 bg-gray-100 rounded w-24 mb-3 animate-pulse"></div>
              <div class="h-3 bg-gray-100 rounded w-full mb-2 animate-pulse"></div>
              <div class="h-3 bg-gray-100 rounded w-3/4 animate-pulse"></div>
            </div>
            <div>
              <div class="h-4 bg-gray-100 rounded w-20 mb-3 animate-pulse"></div>
              <div class="grid grid-cols-2 gap-3">
                <div class="h-20 bg-gray-50 rounded-lg animate-pulse"></div>
                <div class="h-20 bg-gray-50 rounded-lg animate-pulse"></div>
              </div>
            </div>
            <div>
              <div class="h-4 bg-gray-100 rounded w-28 mb-3 animate-pulse"></div>
              <div class="h-3 bg-gray-100 rounded w-full mb-2 animate-pulse"></div>
              <div class="h-3 bg-gray-100 rounded w-2/3 animate-pulse"></div>
            </div>
          </div>
        </div>

        <!-- 错误状态 -->
        <div v-else-if="aiError" class="text-center py-8">
          <svg class="w-12 h-12 mx-auto mb-3 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <p class="text-red-500 mb-3">{{ aiError }}</p>
          <button @click="handleGenerateSummary" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
            重新生成
          </button>
        </div>

        <!-- AI 总结展示 -->
        <div v-else-if="aiSummary" class="space-y-6">
          <!-- 降级提示 -->
          <div v-if="aiSummary.fallback" class="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-2">
            <p class="text-amber-700 text-sm">{{ aiSummary.fallbackMessage }}</p>
            <pre class="text-sm text-gray-600 whitespace-pre-wrap font-sans mt-2">{{ aiSummary.basicContent }}</pre>
          </div>

          <!-- 正常 AI 总结内容 -->
          <template v-if="aiSummary.sections">
            <!-- 1. 个人工作总结 -->
            <section>
              <h4 class="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <span class="w-1 h-5 bg-blue-500 rounded-full"></span>
                个人工作总结
              </h4>
              <div class="bg-blue-50 rounded-lg p-4">
                <p class="text-gray-700 text-sm leading-relaxed">{{ aiSummary.sections.personalSummary.overview }}</p>
              </div>
              <div class="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div v-if="aiSummary.sections.personalSummary.completedWork?.length" class="bg-green-50 rounded-lg p-3">
                  <p class="text-green-700 text-xs font-medium mb-2">✅ 已完成</p>
                  <ul class="space-y-1">
                    <li v-for="(item, i) in aiSummary.sections.personalSummary.completedWork" :key="'done-' + i"
                      class="text-sm text-gray-600 flex items-start gap-1.5">
                      <span class="text-green-400 mt-0.5 shrink-0">•</span>
                      {{ item }}
                    </li>
                  </ul>
                </div>
                <div v-if="aiSummary.sections.personalSummary.inProgressWork?.length" class="bg-amber-50 rounded-lg p-3">
                  <p class="text-amber-700 text-xs font-medium mb-2">🔄 进行中</p>
                  <ul class="space-y-1">
                    <li v-for="(item, i) in aiSummary.sections.personalSummary.inProgressWork" :key="'wip-' + i"
                      class="text-sm text-gray-600 flex items-start gap-1.5">
                      <span class="text-amber-400 mt-0.5 shrink-0">•</span>
                      {{ item }}
                    </li>
                  </ul>
                </div>
              </div>
              <div v-if="aiSummary.sections.personalSummary.workPatterns" class="mt-3 bg-gray-50 rounded-lg p-3">
                <p class="text-xs text-gray-500 font-medium mb-1">📊 工作模式分析</p>
                <p class="text-sm text-gray-600">{{ aiSummary.sections.personalSummary.workPatterns }}</p>
              </div>
            </section>

            <!-- 2. 项目进展 -->
            <section v-if="aiSummary.sections.projectProgress?.length">
              <h4 class="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <span class="w-1 h-5 bg-purple-500 rounded-full"></span>
                项目进展
              </h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div v-for="(project, i) in aiSummary.sections.projectProgress" :key="'proj-' + i"
                  class="border rounded-lg p-4">
                  <div class="flex items-center justify-between mb-2">
                    <h5 class="font-medium text-gray-800 text-sm">{{ project.projectName }}</h5>
                    <span :class="projectStatusClass(project.status)" class="text-xs px-2 py-0.5 rounded-full">
                      {{ project.status }}
                    </span>
                  </div>
                  <p class="text-sm text-gray-600 mb-2">{{ project.summary }}</p>
                  <div v-if="project.achievements?.length" class="mb-1">
                    <p v-for="(a, j) in project.achievements" :key="'pa-' + j" class="text-xs text-green-600 flex items-start gap-1">
                      <span class="mt-0.5">✓</span> {{ a }}
                    </p>
                  </div>
                  <div v-if="project.blockers?.length">
                    <p v-for="(b, j) in project.blockers" :key="'pb-' + j" class="text-xs text-red-500 flex items-start gap-1">
                      <span class="mt-0.5">!</span> {{ b }}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <!-- 3. 团队协作 -->
            <section>
              <h4 class="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <span class="w-1 h-5 bg-teal-500 rounded-full"></span>
                团队协作
              </h4>
              <div class="bg-teal-50 rounded-lg p-4 space-y-2">
                <p class="text-sm text-gray-700">{{ aiSummary.sections.teamCollaboration.collaborationOverview }}</p>
                <p v-if="aiSummary.sections.teamCollaboration.crossProjectInsights" class="text-sm text-gray-600">
                  {{ aiSummary.sections.teamCollaboration.crossProjectInsights }}
                </p>
              </div>
            </section>

            <!-- 4. 关键成果与待改进 -->
            <section>
              <h4 class="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <span class="w-1 h-5 bg-orange-500 rounded-full"></span>
                关键成果与待改进
              </h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div class="bg-green-50 border border-green-100 rounded-lg p-4">
                  <p class="text-green-700 text-xs font-medium mb-2">🏆 关键成就</p>
                  <ul class="space-y-1.5">
                    <li v-for="(item, i) in aiSummary.sections.keyHighlights.achievements" :key="'ach-' + i"
                      class="text-sm text-gray-600 flex items-start gap-1.5">
                      <span class="text-green-400 mt-0.5 shrink-0">•</span>
                      {{ item }}
                    </li>
                  </ul>
                </div>
                <div class="bg-amber-50 border border-amber-100 rounded-lg p-4">
                  <p class="text-amber-700 text-xs font-medium mb-2">📈 待改进</p>
                  <ul class="space-y-1.5">
                    <li v-for="(item, i) in aiSummary.sections.keyHighlights.improvements" :key="'imp-' + i"
                      class="text-sm text-gray-600 flex items-start gap-1.5">
                      <span class="text-amber-400 mt-0.5 shrink-0">•</span>
                      {{ item }}
                    </li>
                  </ul>
                </div>
              </div>
              <!-- 需要关注 -->
              <div v-if="aiSummary.sections.keyHighlights.priorityAlerts?.length" class="mt-3 bg-red-50 border border-red-100 rounded-lg p-4">
                <p class="text-red-700 text-xs font-medium mb-2">⚠️ 需要关注</p>
                <ul class="space-y-1.5">
                  <li v-for="(item, i) in aiSummary.sections.keyHighlights.priorityAlerts" :key="'alert-' + i"
                    class="text-sm text-gray-600 flex items-start gap-1.5">
                    <span class="text-red-400 mt-0.5 shrink-0">!</span>
                    {{ item }}
                  </li>
                </ul>
              </div>
            </section>

            <!-- 5. 下阶段建议 -->
            <section v-if="aiSummary.sections.suggestions?.length">
              <h4 class="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <span class="w-1 h-5 bg-indigo-500 rounded-full"></span>
                下阶段建议
              </h4>
              <div class="space-y-2">
                <div v-for="(s, i) in aiSummary.sections.suggestions" :key="'sug-' + i"
                  class="flex items-start gap-3 bg-gray-50 rounded-lg p-3">
                  <span :class="suggestionCategoryClass(s.category)"
                    class="text-xs px-2 py-0.5 rounded-full shrink-0 mt-0.5 font-medium">
                    {{ s.category }}
                  </span>
                  <div>
                    <p class="text-sm text-gray-700">{{ s.suggestion }}</p>
                    <p class="text-xs text-gray-400 mt-1">{{ s.reason }}</p>
                  </div>
                </div>
              </div>
            </section>
          </template>

          <!-- 底部信息 -->
          <div class="flex items-center justify-between text-xs text-gray-400 border-t border-gray-100 pt-4">
            <span>由 AI 生成于 {{ formatTime(aiSummary.generatedAt) }}</span>
            <button @click="copySummary" class="text-blue-500 hover:text-blue-600 transition-colors">
              复制全文
            </button>
          </div>
        </div>

        <!-- 初始空状态 -->
        <div v-else class="text-center py-12">
          <svg class="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
          <p class="text-gray-400 text-sm">选择总结类型和时间范围，点击"生成总结"获取 AI 智能分析</p>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { getWorkStats } from '@/api/dashboard'
import { generateAISummary } from '@/api/aiSummary'
import type { AISummaryResponse } from '@/api/aiSummary'

// ==================== 时间范围 ====================

const timeRanges = [
  { label: '本周', value: 'week' },
  { label: '本月', value: 'month' },
  { label: '本季度', value: 'quarter' },
  { label: '本年', value: 'year' }
]

const selectedRange = ref('month')
const loading = ref(false)
const error = ref('')
const summaryType = ref<'weekly' | 'monthly' | 'quarterly' | 'yearly'>('weekly')

// ==================== AI 总结状态 ====================

const aiLoading = ref(false)
const aiError = ref('')
const aiSummary = ref<AISummaryResponse | null>(null)

// ==================== 统计数据 ====================

const stats = ref({
  total: 0,
  done: 0,
  inProgress: 0,
  todo: 0
})

const statusCounts = ref<Record<string, number>>({
  TODO: 0,
  IN_PROGRESS: 0,
  DONE: 0,
  CANCELLED: 0
})

const projectStats = ref<Array<{ projectId: string; projectName: string; count: number }>>([])

// 状态列表配置
const statusList = [
  { status: 'TODO', label: '待办', color: 'bg-gray-400' },
  { status: 'IN_PROGRESS', label: '进行中', color: 'bg-blue-500' },
  { status: 'DONE', label: '已完成', color: 'bg-green-500' },
  { status: 'CANCELLED', label: '已取消', color: 'bg-red-400' }
]

// ==================== 计算属性 ====================

const completionRate = computed(() => {
  if (stats.value.total === 0) return 0
  return Math.round((stats.value.done / stats.value.total) * 100)
})

const summaryTypeLabel = computed(() => {
  const map: Record<string, string> = { weekly: '周', monthly: '月', quarterly: '季度', yearly: '年度' }
  return map[summaryType.value] || ''
})

// ==================== 工具函数 ====================

function getPercent(count: number): number {
  const total = stats.value.total || 1
  return Math.round((count / total) * 100)
}

function getDateRange(): { startDate: string; endDate: string } {
  const now = new Date()
  const end = new Date(now)
  let start = new Date(now)

  switch (selectedRange.value) {
    case 'week':
      // 本周一
      const day = now.getDay() || 7
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1)
      break
    case 'month':
      // 本月1号
      start = new Date(now.getFullYear(), now.getMonth(), 1)
      break
    case 'quarter':
      // 本季度初
      const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3
      start = new Date(now.getFullYear(), quarterStartMonth, 1)
      break
    case 'year':
      // 自然年1月1日
      start = new Date(now.getFullYear(), 0, 1)
      break
  }

  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0]
  }
}

function formatTime(isoStr: string): string {
  const d = new Date(isoStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function projectStatusClass(status: string): string {
  if (status.includes('良好')) return 'bg-green-100 text-green-700'
  if (status.includes('关注')) return 'bg-amber-100 text-amber-700'
  if (status.includes('停滞')) return 'bg-red-100 text-red-700'
  return 'bg-gray-100 text-gray-700'
}

function suggestionCategoryClass(category: string): string {
  const map: Record<string, string> = {
    '效率': 'bg-blue-100 text-blue-700',
    '优先级': 'bg-orange-100 text-orange-700',
    '协作': 'bg-teal-100 text-teal-700',
    '规划': 'bg-purple-100 text-purple-700'
  }
  return map[category] || 'bg-gray-100 text-gray-700'
}

// ==================== 数据加载 ====================

async function loadData() {
  loading.value = true
  error.value = ''

  try {
    const range = getDateRange()
    const data = await getWorkStats({
      startDate: range.startDate,
      endDate: range.endDate
    })

    if (data?.statusStats && Array.isArray(data.statusStats)) {
      statusCounts.value = { TODO: 0, IN_PROGRESS: 0, DONE: 0, CANCELLED: 0 }
      data.statusStats.forEach((item: any) => {
        if (item.status in statusCounts.value) {
          statusCounts.value[item.status] = item.count
        }
      })
    }

    stats.value.total = Object.values(statusCounts.value).reduce((a, b) => a + b, 0)
    stats.value.done = statusCounts.value.DONE
    stats.value.inProgress = statusCounts.value.IN_PROGRESS
    stats.value.todo = statusCounts.value.TODO
    projectStats.value = data?.projectStats || []
  } catch (err: any) {
    console.error('加载数据失败:', err)
    error.value = err.message || '加载数据失败'
  } finally {
    loading.value = false
  }
}

// ==================== AI 总结生成 ====================

async function handleGenerateSummary() {
  if (aiLoading.value) return

  aiLoading.value = true
  aiError.value = ''
  aiSummary.value = null

  try {
    const range = getDateRange()
    const data = await generateAISummary({
      type: summaryType.value,
      startDate: range.startDate,
      endDate: range.endDate
    })
    aiSummary.value = data
  } catch (err: any) {
    const msg = err.response?.data?.message
    if (err.response?.status === 429) {
      aiError.value = 'AI总结请求过于频繁，请1分钟后再试'
    } else if (err.response?.status === 503) {
      aiError.value = 'AI总结服务暂未启用，请联系管理员'
    } else if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
      aiError.value = 'AI总结生成超时，请稍后重试'
    } else {
      aiError.value = msg || 'AI总结生成失败，请稍后重试'
    }
  } finally {
    aiLoading.value = false
  }
}

// ==================== 复制 ====================

async function copySummary() {
  if (!aiSummary.value) return

  let text = aiSummary.value.title + '\n\n'

  if (aiSummary.value.basicContent) {
    text += aiSummary.value.basicContent
  } else if (aiSummary.value.sections) {
    const s = aiSummary.value.sections
    text += '【个人工作总结】\n' + s.personalSummary.overview + '\n\n'
    if (s.personalSummary.completedWork?.length) {
      text += '已完成：\n' + s.personalSummary.completedWork.map(w => '  - ' + w).join('\n') + '\n\n'
    }
    if (s.personalSummary.inProgressWork?.length) {
      text += '进行中：\n' + s.personalSummary.inProgressWork.map(w => '  - ' + w).join('\n') + '\n\n'
    }
    if (s.personalSummary.workPatterns) {
      text += '工作模式：' + s.personalSummary.workPatterns + '\n\n'
    }
    if (s.projectProgress?.length) {
      text += '【项目进展】\n'
      s.projectProgress.forEach(p => {
        text += `${p.projectName} (${p.status}): ${p.summary}\n`
      })
      text += '\n'
    }
    text += '【团队协作】\n' + s.teamCollaboration.collaborationOverview + '\n\n'
    if (s.keyHighlights.achievements?.length) {
      text += '【关键成就】\n' + s.keyHighlights.achievements.map(a => '  - ' + a).join('\n') + '\n\n'
    }
    if (s.keyHighlights.improvements?.length) {
      text += '【待改进】\n' + s.keyHighlights.improvements.map(a => '  - ' + a).join('\n') + '\n\n'
    }
    if (s.suggestions?.length) {
      text += '【建议】\n'
      s.suggestions.forEach(sg => {
        text += `  [${sg.category}] ${sg.suggestion} — ${sg.reason}\n`
      })
    }
  }

  try {
    await navigator.clipboard.writeText(text)
    alert('已复制到剪贴板')
  } catch {
    alert('复制失败')
  }
}

// ==================== 生命周期 ====================

watch(selectedRange, () => {
  loadData()
  // 切换时间范围时清除旧的AI总结
  aiSummary.value = null
})

onMounted(() => {
  loadData()
})
</script>
