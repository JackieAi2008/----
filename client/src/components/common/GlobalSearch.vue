<template>
  <div class="global-search relative">
    <!-- 搜索输入框 -->
    <div class="relative">
      <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      <input
        ref="searchInput"
        v-model="keyword"
        type="text"
        placeholder="搜索任务、项目、成员... (Ctrl+K)"
        class="w-64 pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        @input="handleSearch"
        @focus="showDropdown = true"
        @keyup.enter="goToResultPage"
        @keydown.escape="handleEscape"
      />
      <button
        v-if="keyword"
        @click="clearSearch"
        class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
      >
        <X class="w-4 h-4" />
      </button>
    </div>

    <!-- 搜索结果下拉框 -->
    <div
      v-if="showDropdown && (results.total > 0 || loading)"
      class="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg border border-gray-200 shadow-lg z-50 max-h-96 overflow-y-auto"
    >
      <!-- 加载中 -->
      <div v-if="loading" class="p-4 text-center text-gray-500">
        搜索中...
      </div>

      <template v-else>
        <!-- 任务结果 -->
        <div v-if="results.tasks.length > 0" class="border-b border-gray-100">
          <div class="px-3 py-2 text-xs font-medium text-gray-500 bg-gray-50">
            任务
          </div>
          <div
            v-for="task in results.tasks.slice(0, 5)"
            :key="task.id"
            @click="goToTask(task.id)"
            class="px-3 py-2 hover:bg-gray-50 cursor-pointer"
          >
            <div class="font-medium text-gray-800" v-html="task.highlight || task.title"></div>
            <div class="text-xs text-gray-500 mt-1">
              {{ task.projectName }} · 截止 {{ formatDate(task.dueDate) }}
            </div>
          </div>
        </div>

        <!-- 项目结果 -->
        <div v-if="results.projects.length > 0" class="border-b border-gray-100">
          <div class="px-3 py-2 text-xs font-medium text-gray-500 bg-gray-50">
            项目
          </div>
          <div
            v-for="project in results.projects.slice(0, 5)"
            :key="project.id"
            @click="goToProject(project.id)"
            class="px-3 py-2 hover:bg-gray-50 cursor-pointer"
          >
            <div class="font-medium text-gray-800">{{ project.name }}</div>
            <div class="text-xs text-gray-500 mt-1">
              {{ project.memberCount }} 成员 · {{ project.visibility === 'PUBLIC' ? '公开' : '私密' }}
            </div>
          </div>
        </div>

        <!-- 用户结果 -->
        <div v-if="results.users.length > 0">
          <div class="px-3 py-2 text-xs font-medium text-gray-500 bg-gray-50">
            成员
          </div>
          <div
            v-for="user in results.users.slice(0, 5)"
            :key="user.id"
            @click="goToUser(user.id)"
            class="px-3 py-2 hover:bg-gray-50 cursor-pointer flex items-center gap-2"
          >
            <div class="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
              <User class="w-4 h-4 text-gray-500" />
            </div>
            <div>
              <div class="font-medium text-gray-800">{{ user.nickname }}</div>
              <div class="text-xs text-gray-500">{{ user.email }}</div>
            </div>
          </div>
        </div>

        <!-- 查看全部结果 -->
        <div
          v-if="results.total > 5"
          @click="goToResultPage"
          class="px-3 py-2 text-center text-sm text-blue-600 hover:bg-gray-50 cursor-pointer border-t border-gray-100"
        >
          查看全部 {{ results.total }} 个结果
        </div>
      </template>
    </div>

    <!-- 无结果提示 -->
    <div
      v-if="showDropdown && keyword.length >= 2 && !loading && results.total === 0"
      class="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg border border-gray-200 shadow-lg z-50 p-4 text-center text-gray-500"
    >
      未找到相关结果
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 中集智历 - 全局搜索组件
 */
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Search, X, User } from 'lucide-vue-next'
import { globalSearch, type SearchResult } from '@/api/search'
import { formatDate } from '@/utils/date'

const router = useRouter()

const searchInput = ref<HTMLInputElement | null>(null)
const keyword = ref('')
const loading = ref(false)
const showDropdown = ref(false)
const results = ref<SearchResult>({
  keyword: '',
  tasks: [],
  projects: [],
  users: [],
  total: 0
})

let searchTimer: ReturnType<typeof setTimeout> | null = null

async function handleSearch() {
  if (searchTimer) {
    clearTimeout(searchTimer)
  }

  if (keyword.value.length < 2) {
    results.value = {
      keyword: '',
      tasks: [],
      projects: [],
      users: [],
      total: 0
    }
    return
  }

  // 防抖搜索
  searchTimer = setTimeout(async () => {
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
  }, 300)
}

function clearSearch() {
  keyword.value = ''
  results.value = {
    keyword: '',
    tasks: [],
    projects: [],
    users: [],
    total: 0
  }
  showDropdown.value = false
}

function goToTask(id: string) {
  router.push(`/tasks/${id}`)
  showDropdown.value = false
}

function goToProject(id: string) {
  router.push(`/projects/${id}`)
  showDropdown.value = false
}

function goToUser(_id: string) {
  // 跳转到用户详情页（如果有的话）
  router.push(`/settings`)
  showDropdown.value = false
}

function goToResultPage() {
  if (keyword.value.length >= 2) {
    router.push(`/search?keyword=${encodeURIComponent(keyword.value)}`)
    showDropdown.value = false
  }
}

// 处理 Escape 键
function handleEscape() {
  if (showDropdown.value) {
    showDropdown.value = false
  } else if (keyword.value) {
    clearSearch()
  }
}

// 处理全局搜索快捷键
function handleGlobalSearchShortcut() {
  searchInput.value?.focus()
  showDropdown.value = true
}

// 点击外部关闭下拉框
function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (!target.closest('.global-search')) {
    showDropdown.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  // 监听全局搜索快捷键事件
  window.addEventListener('global-search-focus', handleGlobalSearchShortcut)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  window.removeEventListener('global-search-focus', handleGlobalSearchShortcut)
})
</script>
