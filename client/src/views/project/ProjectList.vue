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

    <!-- Tab 切换 -->
    <div class="flex gap-1 mb-5 bg-gray-100 p-1 rounded-lg w-fit">
      <button
        @click="activeTab = 'active'"
        class="px-4 py-2 text-sm font-medium rounded-md transition-colors"
        :class="activeTab === 'active' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
      >
        进行中 ({{ projectStore.activeProjects.length }})
      </button>
      <button
        @click="activeTab = 'archived'"
        class="px-4 py-2 text-sm font-medium rounded-md transition-colors"
        :class="activeTab === 'archived' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
      >
        已归档 ({{ projectStore.archivedProjects.length }})
      </button>
    </div>

    <!-- 分类筛选（仅进行中Tab显示） -->
    <div v-if="activeTab === 'active'" class="flex flex-wrap gap-2 mb-5">
      <button
        @click="activeCategory = 'ALL'"
        class="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors"
        :class="activeCategory === 'ALL' ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
      >
        全部
      </button>
      <button
        v-for="cat in categoryOptions"
        :key="cat.value"
        @click="activeCategory = cat.value"
        class="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors"
        :class="activeCategory === cat.value ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
      >
        {{ cat.label }}
      </button>
    </div>

    <!-- 进行中项目 -->
    <template v-if="activeTab === 'active'">
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
            <!-- 操作按钮组 -->
            <div class="absolute top-3 left-3 flex gap-1.5">
              <button
                @click.stop="confirmDelete(project)"
                class="p-2 bg-white/90 rounded-lg shadow hover:bg-red-50 hover:text-red-600 transition-all duration-200"
                title="删除项目"
              >
                <Trash2 class="w-4 h-4" />
              </button>
              <button
                @click.stop="handleArchive(project)"
                class="p-2 bg-white/90 rounded-lg shadow hover:bg-amber-50 hover:text-amber-600 transition-all duration-200"
                title="归档项目"
              >
                <Archive class="w-4 h-4" />
              </button>
            </div>
            <!-- 可见性标签 -->
            <span
              class="absolute top-3 right-3 px-2.5 py-1 text-xs rounded-lg font-medium backdrop-blur-sm"
              :class="project.visibility === 'PUBLIC' ? 'bg-green-500/90 text-white' : 'bg-gray-900/70 text-white'"
            >
              {{ project.visibility === 'PUBLIC' ? '公开' : '私密' }}
            </span>
            <!-- 分类标签 -->
            <span
              v-if="project.category"
              class="absolute bottom-3 left-3 px-2.5 py-1 text-xs rounded-lg font-medium bg-indigo-500/90 text-white backdrop-blur-sm"
            >
              {{ getCategoryLabel(project.category) }}
            </span>
            <!-- 部门标签 -->
            <span
              v-if="project.department"
              class="absolute top-3 right-16 px-2.5 py-1 text-xs rounded-lg font-medium bg-blue-500/90 text-white"
            >
              {{ project.department.name }}
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
    </template>

    <!-- 已归档项目 -->
    <template v-if="activeTab === 'archived'">
      <div v-if="projectStore.archivedProjects.length === 0" class="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-card">
        <Archive class="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p class="text-gray-500">暂无归档项目</p>
        <p class="text-sm text-gray-400 mt-1">完成的项目可以归档以保持列表整洁</p>
      </div>
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
        <div
          v-for="project in projectStore.archivedProjects"
          :key="project.id"
          class="group bg-white rounded-2xl border border-amber-100 overflow-hidden shadow-card hover:shadow-card-hover cursor-pointer transition-all duration-300 hover:-translate-y-1 opacity-90 hover:opacity-100"
          @click="goToProject(project.id)"
        >
          <div class="relative h-36 md:h-40 overflow-hidden">
            <div
              v-if="project.cover"
              class="absolute inset-0 bg-cover bg-center grayscale-[30%]"
              :style="{ backgroundImage: `url(${project.cover})` }"
            ></div>
            <div v-else class="absolute inset-0 bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 flex items-center justify-center">
              <FolderKanban class="w-12 h-12 text-white/30" />
            </div>
            <!-- 归档标签 -->
            <span class="absolute top-3 left-3 px-2.5 py-1 text-xs rounded-lg font-medium bg-amber-500/90 text-white">
              已归档
            </span>
            <!-- 操作按钮 -->
            <div class="absolute top-3 right-3 flex gap-1.5">
              <button
                @click.stop="handleUnarchive(project)"
                class="p-2 bg-white/90 rounded-lg shadow hover:bg-blue-50 hover:text-blue-600 transition-all duration-200"
                title="取消归档"
              >
                <ArchiveRestore class="w-4 h-4" />
              </button>
              <button
                @click.stop="confirmDelete(project)"
                class="p-2 bg-white/90 rounded-lg shadow hover:bg-red-50 hover:text-red-600 transition-all duration-200"
                title="删除项目"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </div>
          <div class="p-4">
            <h3 class="font-semibold text-gray-800 mb-1 group-hover:text-blue-600 transition-colors">{{ project.name }}</h3>
            <p v-if="project.description" class="text-sm text-gray-500 line-clamp-2 mb-3">{{ project.description }}</p>
            <p v-if="project.archivedAt" class="text-xs text-amber-600">
              {{ getRelativeTime(project.archivedAt) }}归档
            </p>
          </div>
        </div>
      </div>
    </template>

    <!-- 创建项目弹窗 -->
    <Transition name="fade">
      <div v-if="showCreateProject" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-scale-in">
          <form @submit.prevent="handleCreateProject">
            <div class="p-6">
              <h3 class="text-xl font-semibold text-gray-800 mb-5">新建项目</h3>
              <div class="space-y-5">
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
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">项目分类 <span class="text-red-500">*</span></label>
                  <select v-model="newProject.category" class="input cursor-pointer" required>
                    <option value="" disabled>请选择分类</option>
                    <option v-for="cat in categoryOptions" :key="cat.value" :value="cat.value">{{ cat.label }}</option>
                  </select>
                </div>
              </div>
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
                type="submit"
                :disabled="creating || !newProject.name.trim()"
                class="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-medium shadow-button hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {{ creating ? '创建中...' : '创建项目' }}
              </button>
            </div>
          </form>
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
            <p class="text-red-500 text-sm mb-2 font-medium">
              请谨慎删除，删除后无法恢复
            </p>
            <p class="text-gray-500 text-sm mb-6">
              项目「{{ projectToDelete?.name }}」及其所有任务将被永久删除
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
import { Plus, FolderOpen, FolderKanban, Trash2, Archive, ArchiveRestore } from 'lucide-vue-next'
import { useProjectStore } from '@/stores/project'
import { archiveProject, unarchiveProject } from '@/api/project'
import type { Project, ProjectCategory } from '@/types/project'
import { PROJECT_CATEGORY_MAP, PROJECT_CATEGORY_OPTIONS } from '@/types/project'
import { getRelativeTime } from '@/utils/date'
import { devLog } from '@/utils/logger'
import { useToast } from '@/composables/useToast'

const router = useRouter()
const projectStore = useProjectStore()
const toast = useToast()

const activeTab = ref<'active' | 'archived'>('active')
const activeCategory = ref<ProjectCategory | 'ALL'>('ALL')
const showCreateProject = ref(false)
const creating = ref(false)
const showDeleteConfirm = ref(false)
const projectToDelete = ref<Project | null>(null)
const deleting = ref(false)

const projects = computed(() => {
  const all = projectStore.activeProjects
  if (activeCategory.value === 'ALL') return all
  return all.filter(p => p.category === activeCategory.value)
})

const categoryOptions = PROJECT_CATEGORY_OPTIONS

function getCategoryLabel(category: ProjectCategory | null | undefined): string {
  if (!category) return '未分类'
  return PROJECT_CATEGORY_MAP[category] || '未分类'
}

const newProject = reactive({
  name: '',
  description: '',
  visibility: 'PRIVATE' as 'PUBLIC' | 'PRIVATE',
  category: '' as ProjectCategory | ''
})

function goToProject(id: string) {
  router.push(`/projects/${id}`)
}

async function handleCreateProject() {
  if (!newProject.name.trim()) {
    alert('请输入项目名称')
    return
  }

  if (!newProject.category) {
    alert('请选择项目分类')
    return
  }

  creating.value = true
  try {
    const project = await projectStore.createProject({
      name: newProject.name.trim(),
      description: newProject.description.trim() || undefined,
      visibility: newProject.visibility,
      category: newProject.category as ProjectCategory
    })
    showCreateProject.value = false
    newProject.name = ''
    newProject.description = ''
    newProject.visibility = 'PRIVATE'
    newProject.category = ''
    router.push(`/projects/${project.id}`)
  } catch (error) {
    devLog.error('创建项目失败', error)
    alert('创建项目失败，请检查网络连接后重试')
  } finally {
    creating.value = false
  }
}

async function handleArchive(project: Project) {
  if (!confirm(`确定要归档项目「${project.name}」吗？\n归档后可在"已归档"Tab中查看和恢复。`)) return
  try {
    await archiveProject(project.id)
    toast.success('归档成功', `项目「${project.name}」已归档`)
    await projectStore.fetchProjects()
  } catch (e) {
    toast.error('归档失败', e instanceof Error ? e.message : '未知错误')
  }
}

async function handleUnarchive(project: Project) {
  try {
    await unarchiveProject(project.id)
    toast.success('已恢复', `项目「${project.name}」已取消归档`)
    await projectStore.fetchProjects()
  } catch (e) {
    toast.error('恢复失败', e instanceof Error ? e.message : '未知错误')
  }
}

function confirmDelete(project: Project) {
  projectToDelete.value = project
  showDeleteConfirm.value = true
}

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
