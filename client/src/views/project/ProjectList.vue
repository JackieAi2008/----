<template>
  <div>
    <!-- 页面标题和操作 -->
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-2xl font-bold text-gray-800">项目列表</h2>
      <button
        @click="showCreateProject = true"
        class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        <Plus class="w-4 h-4" />
        新建项目
      </button>
    </div>

    <!-- 项目列表 -->
    <div v-if="projectStore.loading" class="text-center py-12 text-gray-500">
      加载中...
    </div>
    <div v-else-if="projects.length === 0" class="text-center py-12">
      <FolderOpen class="w-16 h-16 text-gray-300 mx-auto mb-4" />
      <p class="text-gray-500">暂无项目</p>
      <button
        @click="showCreateProject = true"
        class="mt-4 text-blue-600 hover:text-blue-700"
      >
        创建第一个项目
      </button>
    </div>
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="project in projects"
        :key="project.id"
        class="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md cursor-pointer transition-shadow"
        @click="goToProject(project.id)"
      >
        <!-- 封面 -->
        <div
          v-if="project.cover"
          class="h-32 rounded-lg mb-3 bg-cover bg-center"
          :style="{ backgroundImage: `url(${project.cover})` }"
        ></div>
        <div v-else class="h-32 rounded-lg mb-3 bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
          <FolderKanban class="w-12 h-12 text-white/50" />
        </div>

        <!-- 项目信息 -->
        <h3 class="font-semibold text-gray-800 mb-1">{{ project.name }}</h3>
        <p v-if="project.description" class="text-sm text-gray-500 line-clamp-2 mb-3">
          {{ project.description }}
        </p>

        <div class="flex items-center justify-between text-sm">
          <span
            class="px-2 py-1 rounded-full text-xs"
            :class="project.visibility === 'PUBLIC' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'"
          >
            {{ project.visibility === 'PUBLIC' ? '公开' : '私密' }}
          </span>
          <span class="text-gray-400">
            {{ getRelativeTime(project.createdAt) }}创建
          </span>
        </div>
      </div>
    </div>

    <!-- 创建项目弹窗 -->
    <div v-if="showCreateProject" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 class="text-lg font-semibold mb-4">新建项目</h3>
        <form @submit.prevent="handleCreateProject">
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">项目名称</label>
              <input v-model="newProject.name" type="text" class="input" required />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">项目描述</label>
              <textarea v-model="newProject.description" class="input" rows="3"></textarea>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">可见性</label>
              <select v-model="newProject.visibility" class="input">
                <option value="PRIVATE">私密</option>
                <option value="PUBLIC">公开</option>
              </select>
            </div>
          </div>
          <div class="flex justify-end gap-3 mt-6">
            <button
              type="button"
              @click="showCreateProject = false"
              class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              取消
            </button>
            <button
              type="submit"
              :disabled="creating"
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {{ creating ? '创建中...' : '创建' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 中集智历 - 项目列表页面
 */
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, FolderOpen, FolderKanban } from 'lucide-vue-next'
import { useProjectStore } from '@/stores/project'
import { getRelativeTime } from '@/utils/date'
import { devLog } from '@/utils/logger'

const router = useRouter()
const projectStore = useProjectStore()

const showCreateProject = ref(false)
const creating = ref(false)

const projects = computed(() => projectStore.activeProjects)

const newProject = reactive({
  name: '',
  description: '',
  visibility: 'PRIVATE' as 'PUBLIC' | 'PRIVATE'
})

function goToProject(id: string) {
  router.push(`/projects/${id}`)
}

async function handleCreateProject() {
  creating.value = true
  try {
    const project = await projectStore.createProject(newProject)
    showCreateProject.value = false
    // 重置表单
    newProject.name = ''
    newProject.description = ''
    newProject.visibility = 'PRIVATE'
    // 跳转到项目详情
    router.push(`/projects/${project.id}`)
  } catch (error) {
    devLog.error('创建项目失败', error)
    alert('创建项目失败')
  } finally {
    creating.value = false
  }
}

onMounted(() => {
  projectStore.fetchProjects()
})
</script>
