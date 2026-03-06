<template>
  <div class="deleted-projects">
    <!-- 页面头部 -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">已删除的项目</h1>
        <p class="text-gray-500 mt-1">项目删除后30天内可恢复，超过期限将永久删除</p>
      </div>
      <router-link
        to="/projects"
        class="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
      >
        返回项目列表
      </router-link>
    </div>

    <!-- 加载中 -->
    <div v-if="loading" class="text-center py-12 text-gray-500">
      加载中...
    </div>

    <!-- 空状态 -->
    <div v-else-if="projects.length === 0" class="text-center py-12">
      <Trash2 class="w-16 h-16 text-gray-300 mx-auto mb-4" />
      <p class="text-gray-500">暂无已删除的项目</p>
    </div>

    <!-- 项目列表 -->
    <div v-else class="space-y-4">
      <div
        v-for="project in projects"
        :key="project.id"
        class="bg-white rounded-lg border border-gray-200 p-4 hover:border-gray-300 transition-colors"
      >
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <h3 class="font-medium text-gray-800">{{ project.name }}</h3>
            <p v-if="project.description" class="text-sm text-gray-500 mt-1">
              {{ project.description }}
            </p>
            <div class="flex items-center gap-4 mt-3 text-sm">
              <span class="text-gray-500">
                <FileText class="w-4 h-4 inline mr-1" />
                {{ project.taskCount }} 个任务
              </span>
              <span class="text-gray-500">
                <Clock class="w-4 h-4 inline mr-1" />
                删除于 {{ formatDate(project.deletedAt) }}
              </span>
              <span
                :class="[
                  'px-2 py-0.5 rounded text-xs',
                  project.daysRemaining <= 7
                    ? 'bg-red-100 text-red-700'
                    : project.daysRemaining <= 14
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-gray-100 text-gray-600'
                ]"
              >
                剩余 {{ project.daysRemaining }} 天
              </span>
            </div>
          </div>
          <div class="flex gap-2">
            <button
              @click="handleRestore(project)"
              :disabled="restoring === project.id"
              class="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {{ restoring === project.id ? '恢复中...' : '恢复' }}
            </button>
            <button
              @click="showDeleteConfirm(project)"
              class="px-3 py-1.5 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
            >
              永久删除
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 永久删除确认弹窗 -->
    <div v-if="showConfirm" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h3 class="text-lg font-semibold text-red-600 mb-2">确认永久删除</h3>
        <p class="text-gray-600 mb-4">
          确定要永久删除项目「{{ selectedProject?.name }}」吗？此操作不可撤销，所有相关数据将被删除。
        </p>
        <div class="flex justify-end gap-3">
          <button
            @click="showConfirm = false"
            class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            取消
          </button>
          <button
            @click="handlePermanentDelete"
            :disabled="deleting"
            class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {{ deleting ? '删除中...' : '确认删除' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 中集智历 - 已删除项目列表页面
 */
import { ref, onMounted } from 'vue'
import { Trash2, FileText, Clock } from 'lucide-vue-next'
import {
  getDeletedProjects,
  restoreProject,
  permanentDeleteProject,
  type DeletedProject
} from '@/api/project'
import { formatDate } from '@/utils/date'

const loading = ref(true)
const projects = ref<DeletedProject[]>([])
const restoring = ref<string | null>(null)
const deleting = ref(false)
const showConfirm = ref(false)
const selectedProject = ref<DeletedProject | null>(null)

async function fetchDeletedProjects() {
  loading.value = true
  try {
    projects.value = await getDeletedProjects()
  } catch {
    projects.value = []
  } finally {
    loading.value = false
  }
}

async function handleRestore(project: DeletedProject) {
  restoring.value = project.id
  try {
    await restoreProject(project.id)
    alert('项目已恢复')
    await fetchDeletedProjects()
  } catch {
    alert('恢复失败')
  } finally {
    restoring.value = null
  }
}

function showDeleteConfirm(project: DeletedProject) {
  selectedProject.value = project
  showConfirm.value = true
}

async function handlePermanentDelete() {
  if (!selectedProject.value) return

  deleting.value = true
  try {
    await permanentDeleteProject(selectedProject.value.id)
    alert('项目已永久删除')
    showConfirm.value = false
    await fetchDeletedProjects()
  } catch {
    alert('删除失败')
  } finally {
    deleting.value = false
  }
}

onMounted(fetchDeletedProjects)
</script>
