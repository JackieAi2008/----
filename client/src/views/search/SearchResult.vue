<template>
  <div class="search-result">
    <!-- 页面头部 -->
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-800">搜索结果</h1>
      <p v-if="keyword" class="text-gray-500 mt-1">
        找到 "{{ keyword }}" 的 {{ totalResults }} 个结果
      </p>
    </div>

    <!-- 搜索框 -->
    <div class="mb-6">
      <div class="relative max-w-xl">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          v-model="searchKeyword"
          type="text"
          placeholder="搜索任务、项目、成员..."
          class="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          @keyup.enter="handleSearch"
        />
        <button
          @click="handleSearch"
          class="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
        >
          搜索
        </button>
      </div>
    </div>

    <!-- 加载中 -->
    <div v-if="loading" class="text-center py-12 text-gray-500">
      搜索中...
    </div>

    <template v-else>
      <!-- 筛选标签 -->
      <div class="flex gap-2 mb-6">
        <button
          v-for="tab in tabs"
          :key="tab.value"
          @click="activeTab = tab.value"
          :class="[
            'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            activeTab === tab.value
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          ]"
        >
          {{ tab.label }}
          <span class="ml-1 text-xs opacity-75">({{ tab.count }})</span>
        </button>
      </div>

      <!-- 任务结果 -->
      <div v-if="activeTab === 'all' || activeTab === 'task'" class="space-y-3 mb-6">
        <h2 v-if="results.tasks.length > 0" class="text-lg font-semibold text-gray-800">
          任务
        </h2>
        <div
          v-for="task in results.tasks"
          :key="task.id"
          @click="goToTask(task.id)"
          class="bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-300 cursor-pointer transition-colors"
        >
          <div class="flex items-start justify-between">
            <div>
              <h3 class="font-medium text-gray-800" v-html="task.highlight || task.title"></h3>
              <p v-if="task.description" class="text-sm text-gray-500 mt-1 line-clamp-2">
                {{ task.description }}
              </p>
              <div class="flex items-center gap-4 mt-2 text-sm text-gray-500">
                <span>{{ task.projectName }}</span>
                <span>截止 {{ formatDate(task.dueDate) }}</span>
              </div>
            </div>
            <span
              :class="[
                'px-2 py-1 rounded text-xs',
                getStatusClass(task.status)
              ]"
            >
              {{ getStatusText(task.status) }}
            </span>
          </div>
        </div>
      </div>

      <!-- 项目结果 -->
      <div v-if="activeTab === 'all' || activeTab === 'project'" class="space-y-3 mb-6">
        <h2 v-if="results.projects.length > 0" class="text-lg font-semibold text-gray-800">
          项目
        </h2>
        <div
          v-for="project in results.projects"
          :key="project.id"
          @click="goToProject(project.id)"
          class="bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-300 cursor-pointer transition-colors"
        >
          <div class="flex items-start justify-between">
            <div>
              <h3 class="font-medium text-gray-800">{{ project.name }}</h3>
              <p v-if="project.description" class="text-sm text-gray-500 mt-1">
                {{ project.description }}
              </p>
              <div class="flex items-center gap-4 mt-2 text-sm text-gray-500">
                <span>{{ project.memberCount }} 成员</span>
                <span>{{ project.visibility === 'PUBLIC' ? '公开' : '私密' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 用户结果 -->
      <div v-if="activeTab === 'all' || activeTab === 'user'" class="space-y-3 mb-6">
        <h2 v-if="results.users.length > 0" class="text-lg font-semibold text-gray-800">
          成员
        </h2>
        <div
          v-for="user in results.users"
          :key="user.id"
          class="bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-300 cursor-pointer transition-colors flex items-center gap-4"
        >
          <div class="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
            <User class="w-6 h-6 text-gray-500" />
          </div>
          <div>
            <h3 class="font-medium text-gray-800">{{ user.nickname }}</h3>
            <p class="text-sm text-gray-500">{{ user.email }}</p>
          </div>
        </div>
      </div>

      <!-- 无结果 -->
      <div
        v-if="results.total === 0 && keyword.length >= 2"
        class="text-center py-12"
      >
        <Search class="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p class="text-gray-500">未找到 "{{ keyword }}" 的相关结果</p>
        <p class="text-sm text-gray-400 mt-2">请尝试其他关键词</p>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
/**
 * 中集智历 - 搜索结果页面
 */
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Search, User } from 'lucide-vue-next'
import { globalSearch, type SearchResult } from '@/api/search'
import { formatDate } from '@/utils/date'

const route = useRoute()
const router = useRouter()

const keyword = ref('')
const searchKeyword = ref('')
const loading = ref(false)
const activeTab = ref('all')
const results = ref<SearchResult>({
  keyword: '',
  tasks: [],
  projects: [],
  users: [],
  total: 0
})

const tabs = computed(() => [
  { value: 'all', label: '全部', count: results.value.total },
  { value: 'task', label: '任务', count: results.value.tasks.length },
  { value: 'project', label: '项目', count: results.value.projects.length },
  { value: 'user', label: '成员', count: results.value.users.length }
])

const totalResults = computed(() => results.value.total)

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

async function handleSearch() {
  if (searchKeyword.value.length < 2) return

  keyword.value = searchKeyword.value
  router.push(`/search?keyword=${encodeURIComponent(searchKeyword.value)}`)
  await fetchResults()
}

async function fetchResults() {
  if (keyword.value.length < 2) return

  loading.value = true
  try {
    results.value = await globalSearch({ keyword: keyword.value })
  } catch {
    results.value = {
      keyword: keyword.value,
      tasks: [],
      projects: [],
      users: [],
      total: 0
    }
  } finally {
    loading.value = false
  }
}

function goToTask(id: string) {
  router.push(`/tasks/${id}`)
}

function goToProject(id: string) {
  router.push(`/projects/${id}`)
}

// 监听路由参数变化
watch(() => route.query.keyword, (newKeyword) => {
  if (newKeyword && typeof newKeyword === 'string') {
    keyword.value = newKeyword
    searchKeyword.value = newKeyword
    fetchResults()
  }
}, { immediate: true })

onMounted(() => {
  const queryKeyword = route.query.keyword
  if (queryKeyword && typeof queryKeyword === 'string') {
    keyword.value = queryKeyword
    searchKeyword.value = queryKeyword
    fetchResults()
  }
})
</script>
