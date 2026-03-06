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
                {{ getPriorityText(task.priority) }}优先级
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
  </div>
</template>

<script setup lang="ts">
/**
 * 中集智历 - 归档任务列表页面
 */
import { ref, onMounted } from 'vue'
import { Archive, FolderKanban, User, Clock } from 'lucide-vue-next'
import { getArchivedTasks, archiveCompletedTasks, unarchiveTask } from '@/api/task'
import { formatDate } from '@/utils/date'
import type { Task } from '@/types/task'

const loading = ref(true)
const tasks = ref<Task[]>([])
const archiving = ref(false)
const restoring = ref<string | null>(null)

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

onMounted(fetchArchivedTasks)
</script>
