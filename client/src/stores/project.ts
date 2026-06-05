/**
 * 中集智历 - 项目状态管理
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Project, ProjectCategory } from '@/types/project'
import * as projectApi from '@/api/project'

export const useProjectStore = defineStore('project', () => {
  // 状态
  const projects = ref<Project[]>([])
  const currentProject = ref<Project | null>(null)
  const loading = ref(false)

  // 计算属性
  const projectCount = computed(() => projects.value.length)
  const activeProjects = computed(() =>
    projects.value.filter(p => !p.deletedAt && !p.isArchived)
  )

  const archivedProjects = computed(() =>
    projects.value.filter(p => !p.deletedAt && p.isArchived)
  )

  // 获取项目列表
  async function fetchProjects() {
    loading.value = true
    try {
      const response = await projectApi.getProjects()
      projects.value = response
      return response
    } finally {
      loading.value = false
    }
  }

  // 获取项目详情
  async function fetchProject(id: string) {
    loading.value = true
    try {
      const response = await projectApi.getProject(id)
      currentProject.value = response
      return response
    } finally {
      loading.value = false
    }
  }

  // 创建项目
  async function createProject(data: {
    name: string
    description?: string
    visibility: 'PUBLIC' | 'PRIVATE'
    category?: ProjectCategory
  }) {
    const response = await projectApi.createProject(data)
    projects.value.push(response)
    return response
  }

  // 更新项目
  async function updateProject(id: string, data: Partial<Project>) {
    // 转换数据类型，将 null 转换为 undefined
    const requestData = {
      ...data,
      description: data.description ?? undefined,
      cover: data.cover ?? undefined,
      category: data.category ?? undefined
    }
    const response = await projectApi.updateProject(id, requestData)
    const index = projects.value.findIndex(p => p.id === id)
    if (index !== -1) {
      projects.value[index] = response
    }
    if (currentProject.value?.id === id) {
      currentProject.value = response
    }
    return response
  }

  // 删除项目
  async function deleteProject(id: string) {
    await projectApi.deleteProject(id)
    projects.value = projects.value.filter(p => p.id !== id)
    if (currentProject.value?.id === id) {
      currentProject.value = null
    }
  }

  return {
    projects,
    currentProject,
    loading,
    projectCount,
    activeProjects,
    archivedProjects,
    fetchProjects,
    fetchProject,
    createProject,
    updateProject,
    deleteProject
  }
})
