<template>
  <div class="animate-slide-up">
    <!-- 页面标题和操作 -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <h2 class="text-xl md:text-2xl font-bold text-gray-800">项目列表</h2>
      <button
        @click="showCreateProject = true"
        class="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-medium shadow-button hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
      >
        <Plus class="w-4 h-4" />
        新建项目
      </button>
    </div>

    <!-- 项目列表 -->
    <div v-if="projectStore.loading" class="text-center py-16 text-gray-500">
      <div class="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
      加载中...
    </div>
    <div v-else-if="projects.length === 0" class="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-card">
      <FolderOpen class="w-16 h-16 text-gray-300 mx-auto mb-4" />
      <p class="text-gray-500">暂无项目</p>
      <button
        @click="showCreateProject = true"
        class="mt-4 text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1"
      >
        <Plus class="w-4 h-4" />
        创建第一个项目
      </button>
    </div>
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
      <div
        v-for="(project, index) in projects"
        :key="project.id"
        class="group bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-card hover:shadow-card-hover cursor-pointer transition-all duration-300 hover:-translate-y-1"
        :style="{ animationDelay: `${index * 50}ms` }"
        @click="goToProject(project.id)"
      >
        <!-- 封面 -->
        <div class="relative h-36 md:h-40 overflow-hidden">
          <div
            v-if="project.cover"
            class="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
            :style="{ backgroundImage: `url(${project.cover})` }"
          ></div>
          <div v-else class="absolute inset-0 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 flex items-center justify-center">
            <FolderKanban class="w-12 h-12 text-white/30 group-hover:scale-110 transition-transform duration-300" />
          </div>
          <!-- 删除按钮 -->
          <button
            @click.stop="confirmDelete(project)"
            class="absolute top-3 left-3 p-2 bg-white/90 rounded-lg shadow opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 transition-all duration-200"
            title="删除项目"
          >
            <Trash2 class="w-4 h-4" />
          </button>
          <!-- 可见性标签 -->
          <span
            class="absolute top-3 right-3 px-2.5 py-1 text-xs rounded-lg font-medium backdrop-blur-sm"
            :class="project.visibility === 'PUBLIC' ? 'bg-green-500/90 text-white' : 'bg-gray-900/70 text-white'"
          >
            {{ project.visibility === 'PUBLIC' ? '公开' : '私密' }}
          </span>
        </div>

        <!-- 项目信息 -->
        <div class="p-4">
          <h3 class="font-semibold text-gray-800 mb-1 group-hover:text-blue-600 transition-colors">{{ project.name }}</h3>
          <p v-if="project.description" class="text-sm text-gray-500 line-clamp-2 mb-3">
            {{ project.description }}
          </p>

          <div class="flex items-center justify-between text-sm">
            <span class="text-gray-400">
              {{ getRelativeTime(project.createdAt) }}创建
            </span>
            <span class="text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
              查看详情 →
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 创建项目弹窗 -->
    <Transition name="fade">
      <div v-if="showCreateProject" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-scale-in">
          <div class="p-6">
            <h3 class="text-xl font-semibold text-gray-800 mb-5">新建项目</h3>
            <form @submit.prevent="handleCreateProject" class="space-y-5">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">项目名称</label>
                <input v-model="newProject.name" type="text" class="input" placeholder="输入项目名称" required />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">项目描述</label>
                <textarea v-model="newProject.description" class="input resize-none" rows="3" placeholder="简单描述项目内容"></textarea>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">可见性</label>
                <select v-model="newProject.visibility" class="input cursor-pointer">
                  <option value="PRIVATE">私密</option>
                  <option value="PUBLIC">公开</option>
                </select>
              </div>
            </form>
          </div>
          <div class="flex justify-end gap-3 px-6 py-4 bg-gray-50/50 rounded-b-2xl">
            <button
              type="button"
              @click="showCreateProject = false"
              class="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl font-medium transition-colors"
            >
              取消
            </button>
            <button
              @click="handleCreateProject"
              :disabled="creating"
              class="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-medium shadow-button hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {{ creating ? '创建中...' : '创建项目' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 删除确认弹窗 -->
    <Transition name="fade">
      <div v-if="showDeleteConfirm" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-scale-in">
          <div class="p-6 text-center">
            <div class="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 class="w-7 h-7 text-red-600" />
            </div>
            <h3 class="text-lg font-semibold text-gray-800 mb-2">确认删除项目？</h3>
            <p class="text-gray-500 text-sm mb-6">
              项目「{{ projectToDelete?.name }}」将移入回收站，30天内可恢复
            </p>
            <div class="flex gap-3">
              <button
                @click="showDeleteConfirm = false; projectToDelete = null"
                class="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 font-medium transition-colors"
              >
                取消
              </button>
              <button
                @click="handleDeleteProject"
                :disabled="deleting"
                class="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {{ deleting ? '删除中...' : '确认删除' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
/**
 * 中集智历 - 项目列表页面
 */
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, FolderOpen, FolderKanban, Trash2 } from 'lucide-vue-next'
import { useProjectStore } from '@/stores/project'
import type { Project } from '@/types/project'
import { getRelativeTime } from '@/utils/date'
import { devLog } from '@/utils/logger'

const router = useRouter()
const projectStore = useProjectStore()

const showCreateProject = ref(false)
const creating = ref(false)
const showDeleteConfirm = ref(false)
const projectToDelete = ref<Project | null>(null)
const deleting = ref(false)

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

// 确认删除
function confirmDelete(project: Project) {
  projectToDelete.value = project
  showDeleteConfirm.value = true
}

// 执行删除
async function handleDeleteProject() {
  if (!projectToDelete.value) return

  deleting.value = true
  try {
    await projectStore.deleteProject(projectToDelete.value.id)
    showDeleteConfirm.value = false
    projectToDelete.value = null
  } catch (error) {
    devLog.error('删除项目失败', error)
    alert('删除项目失败')
  } finally {
    deleting.value = false
  }
}

onMounted(() => {
  projectStore.fetchProjects()
})
</script>
