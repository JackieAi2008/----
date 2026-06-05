<template>
  <div class="archived-tasks">
    <!-- 页面头部 -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">归档任务</h1>
        <p class="text-gray-500 mt-1">已完成超过30天的任务会被自动归档</p>
      </div>
      <div class="flex gap-3">
        <button
          v-if="isAdmin"
          @click="showStatsDialog = true"
          class="px-4 py-2 text-sm border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50"
        >
          评价统计
        </button>
        <button
          @click="handleArchive"
          :disabled="archiving"
          class="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {{ archiving ? '归档中...' : '归档已完成任务' }}
        </button>
        <router-link
          to="/calendar"
          class="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          返回日历
        </router-link>
      </div>
    </div>

    <!-- 加载中 -->
    <div v-if="loading" class="text-center py-12 text-gray-500">
      加载中...
    </div>

    <!-- 空状态 -->
    <div v-else-if="tasks.length === 0" class="text-center py-12">
      <Archive class="w-16 h-16 text-gray-300 mx-auto mb-4" />
      <p class="text-gray-500">暂无归档任务</p>
      <p class="text-sm text-gray-400 mt-2">已完成超过30天的任务会自动显示在这里</p>
    </div>

    <!-- 任务列表 -->
    <div v-else class="space-y-4">
      <div
        v-for="task in tasks"
        :key="task.id"
        class="bg-white rounded-lg border border-gray-200 p-4 hover:border-gray-300 transition-colors"
      >
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-1">
              <span class="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">
                已完成
              </span>
              <span
                class="px-2 py-1 text-xs rounded-full"
                :class="getPriorityClass(task.priority)"
              >
                {{ getPriorityText(task.priority) }}
              </span>
              <!-- 评价星级 -->
              <span v-if="task.evaluations && task.evaluations.length > 0" class="flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-yellow-50 text-yellow-700">
                <Star class="w-3 h-3 fill-yellow-400 text-yellow-400" />
                {{ getAvgRating(task.evaluations) }}
              </span>
            </div>
            <h3 class="font-medium text-gray-800">{{ task.title }}</h3>
            <div class="flex items-center gap-4 mt-2 text-sm text-gray-500">
              <span class="flex items-center gap-1">
                <FolderKanban class="w-4 h-4" />
                {{ task.project?.name }}
              </span>
              <span class="flex items-center gap-1">
                <User class="w-4 h-4" />
                {{ task.assignee?.nickname }}
              </span>
              <span class="flex items-center gap-1">
                <Clock class="w-4 h-4" />
                归档于 {{ formatDate(task.archivedAt || '') }}
              </span>
            </div>
          </div>
          <div class="flex gap-2">
            <!-- 管理员评价按钮 -->
            <button
              v-if="isAdmin"
              @click="openEvaluation(task)"
              class="px-3 py-1.5 text-sm border border-yellow-400 text-yellow-700 rounded-lg hover:bg-yellow-50"
            >
              评价
            </button>
            <router-link
              :to="`/tasks/${task.id}`"
              class="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              查看
            </router-link>
            <button
              @click="handleRestore(task)"
              :disabled="restoring === task.id"
              class="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {{ restoring === task.id ? '恢复中...' : '恢复' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 评价对话框 -->
    <div v-if="evaluatingTask" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold">评价任务</h3>
          <button @click="evaluatingTask = null" class="p-1 hover:bg-gray-100 rounded">
            <X class="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <p class="text-sm text-gray-600 mb-4">{{ evaluatingTask.title }}</p>

        <div class="space-y-4">
          <!-- 被评价人 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">被评价人</label>
            <p class="text-sm text-gray-800">{{ evaluatingTask.assignee?.nickname }}</p>
          </div>

          <!-- 星级评价 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">评分</label>
            <div class="flex gap-1">
              <button
                v-for="star in 5"
                :key="star"
                type="button"
                @click="evalRating = star"
                class="p-1"
              >
                <Star
                  class="w-8 h-8"
                  :class="star <= evalRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'"
                />
              </button>
            </div>
          </div>

          <!-- 评价备注 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">备注</label>
            <textarea
              v-model="evalComment"
              class="input"
              rows="2"
              placeholder="评价备注（可选）"
            ></textarea>
          </div>

          <div class="flex justify-end gap-2">
            <button
              @click="evaluatingTask = null"
              class="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              取消
            </button>
            <button
              @click="submitEvaluation"
              :disabled="evalRating === 0 || submittingEval"
              class="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {{ submittingEval ? '提交中...' : '提交评价' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 评价统计对话框 -->
    <div v-if="showStatsDialog" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold">人员评价统计</h3>
          <button @click="showStatsDialog = false" class="p-1 hover:bg-gray-100 rounded">
            <X class="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div v-if="loadingStats" class="text-center py-8 text-gray-500">加载中...</div>

        <div v-else-if="userStats.length === 0" class="text-center py-8 text-gray-500">
          暂无评价数据
        </div>

        <div v-else class="space-y-4">
          <div
            v-for="stat in userStats"
            :key="stat.user.id"
            class="border rounded-lg p-4"
          >
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <span class="text-sm text-blue-600">{{ stat.user.nickname?.charAt(0) }}</span>
                </div>
                <span class="font-medium">{{ stat.user.nickname }}</span>
              </div>
              <div class="flex items-center gap-1">
                <Star class="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span class="font-semibold">{{ stat.averageRating }}</span>
                <span class="text-xs text-gray-400">({{ stat.evaluationCount }}次)</span>
              </div>
            </div>
            <!-- 按项目分组 -->
            <div v-if="stat.byProject.length > 0" class="ml-10 space-y-1">
              <div
                v-for="proj in stat.byProject"
                :key="proj.project.id"
                class="flex items-center justify-between text-sm"
              >
                <span class="text-gray-600">{{ proj.project.name }}</span>
                <span class="text-gray-500">
                  <Star class="w-3 h-3 inline fill-yellow-400 text-yellow-400" />
                  {{ proj.averageRating }} ({{ proj.evaluationCount }}次)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 中集智历 - 归档任务列表页面（含评价功能）
 */
import { ref, onMounted, computed } from 'vue'
import { Archive, FolderKanban, User, Clock, Star, X } from 'lucide-vue-next'
import { getArchivedTasks, archiveCompletedTasks, unarchiveTask } from '@/api/task'
import { createEvaluation, getUserEvaluationStats, type UserEvaluationStat } from '@/api/evaluation'
import { formatDate } from '@/utils/date'
import { useAuthStore } from '@/stores/auth'
import { PRIORITY_MAP, type Evaluation } from '@/types/task'
import type { Task } from '@/types/task'

const authStore = useAuthStore()
const isAdmin = computed(() => authStore.isAdmin)

const loading = ref(true)
const tasks = ref<Task[]>([])
const archiving = ref(false)
const restoring = ref<string | null>(null)

// 评价相关
const evaluatingTask = ref<Task | null>(null)
const evalRating = ref(0)
const evalComment = ref('')
const submittingEval = ref(false)

// 统计相关
const showStatsDialog = ref(false)
const loadingStats = ref(false)
const userStats = ref<UserEvaluationStat[]>([])

async function fetchArchivedTasks() {
  loading.value = true
  try {
    tasks.value = await getArchivedTasks()
  } catch {
    tasks.value = []
  } finally {
    loading.value = false
  }
}

async function handleArchive() {
  if (!confirm('确定要归档所有已完成超过30天的任务吗？')) return

  archiving.value = true
  try {
    const result = await archiveCompletedTasks()
    alert(result.count > 0 ? `已归档 ${result.count} 个任务` : '没有需要归档的任务')
    await fetchArchivedTasks()
  } catch {
    alert('归档失败')
  } finally {
    archiving.value = false
  }
}

async function handleRestore(task: Task) {
  restoring.value = task.id
  try {
    await unarchiveTask(task.id)
    alert('任务已恢复')
    await fetchArchivedTasks()
  } catch {
    alert('恢复失败')
  } finally {
    restoring.value = null
  }
}

function getPriorityClass(priority: string): string {
  const info = PRIORITY_MAP[priority as keyof typeof PRIORITY_MAP]
  return info ? `${info.bgColor} ${info.color}` : 'bg-gray-100 text-gray-600'
}

function getPriorityText(priority: string): string {
  const info = PRIORITY_MAP[priority as keyof typeof PRIORITY_MAP]
  return info?.label || '中'
}

function getAvgRating(evaluations: Evaluation[]): string {
  if (!evaluations || evaluations.length === 0) return '0'
  const avg = evaluations.reduce((s, e) => s + e.rating, 0) / evaluations.length
  return Math.round(avg * 10) / 10 + ''
}

// 评价
function openEvaluation(task: Task) {
  evaluatingTask.value = task
  evalRating.value = 0
  evalComment.value = ''
}

async function submitEvaluation() {
  if (!evaluatingTask.value || evalRating.value === 0) return
  submittingEval.value = true
  try {
    await createEvaluation({
      taskId: evaluatingTask.value.id,
      targetUserId: evaluatingTask.value.assigneeId,
      rating: evalRating.value,
      comment: evalComment.value || undefined
    })
    alert('评价提交成功')
    evaluatingTask.value = null
    await fetchArchivedTasks()
  } catch (e: any) {
    alert(e?.response?.data?.message || '评价提交失败')
  } finally {
    submittingEval.value = false
  }
}

// 统计
async function fetchStats() {
  loadingStats.value = true
  try {
    userStats.value = await getUserEvaluationStats()
  } catch {
    userStats.value = []
  } finally {
    loadingStats.value = false
  }
}

// 打开统计时加载数据
import { watch } from 'vue'
watch(showStatsDialog, (v) => {
  if (v) fetchStats()
})

onMounted(fetchArchivedTasks)
</script>
