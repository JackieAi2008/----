/**
 * 中集智历 - 部门状态管理
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Department, DepartmentOption, CreateDepartmentRequest, UpdateDepartmentRequest } from '@/types/department'
import * as departmentApi from '@/api/department'

export const useDepartmentStore = defineStore('department', () => {
  // 状态
  const departments = ref<Department[]>([])
  const myDepartment = ref<Department | null>(null)
  const departmentOptions = ref<DepartmentOption[]>([])
  const currentDepartment = ref<Department | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // 计算属性
  const hasDepartments = computed(() => departments.value.length > 0)
  const isDepartmentAdmin = computed(() => !!myDepartment.value)

  // 获取所有部门（系统管理员）
  async function fetchDepartments() {
    loading.value = true
    error.value = null
    try {
      departments.value = await departmentApi.getDepartments()
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : '获取部门列表失败'
      throw e
    } finally {
      loading.value = false
    }
  }

  // 获取部门选项列表
  async function fetchDepartmentOptions() {
    try {
      departmentOptions.value = await departmentApi.getDepartmentOptions()
    } catch (e: unknown) {
      console.error('获取部门选项失败:', e)
    }
  }

  // 获取我管理的部门
  async function fetchMyDepartment() {
    loading.value = true
    error.value = null
    try {
      myDepartment.value = await departmentApi.getMyDepartment()
      return myDepartment.value
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : '获取部门信息失败'
      return null
    } finally {
      loading.value = false
    }
  }

  // 获取部门详情
  async function fetchDepartmentById(id: string) {
    loading.value = true
    error.value = null
    try {
      currentDepartment.value = await departmentApi.getDepartmentById(id)
      return currentDepartment.value
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : '获取部门详情失败'
      return null
    } finally {
      loading.value = false
    }
  }

  // 创建部门
  async function createDepartment(data: CreateDepartmentRequest) {
    loading.value = true
    error.value = null
    try {
      const department = await departmentApi.createDepartment(data)
      departments.value.unshift(department)
      return department
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : '创建部门失败'
      throw e
    } finally {
      loading.value = false
    }
  }

  // 更新部门
  async function updateDepartment(id: string, data: UpdateDepartmentRequest) {
    loading.value = true
    error.value = null
    try {
      const department = await departmentApi.updateDepartment(id, data)
      const index = departments.value.findIndex(d => d.id === id)
      if (index !== -1) {
        departments.value[index] = department
      }
      if (myDepartment.value?.id === id) {
        myDepartment.value = department
      }
      return department
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : '更新部门失败'
      throw e
    } finally {
      loading.value = false
    }
  }

  // 删除部门
  async function deleteDepartment(id: string, targetDepartmentId?: string) {
    loading.value = true
    error.value = null
    try {
      await departmentApi.deleteDepartment(id, targetDepartmentId ? { targetDepartmentId } : undefined)
      departments.value = departments.value.filter(d => d.id !== id)
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : '删除部门失败'
      throw e
    } finally {
      loading.value = false
    }
  }

  // 添加部门成员
  async function addMember(departmentId: string, userId: string) {
    try {
      await departmentApi.addDepartmentMember(departmentId, userId)
      // 刷新部门信息
      if (myDepartment.value?.id === departmentId) {
        await fetchMyDepartment()
      }
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : '添加成员失败'
      throw e
    }
  }

  // 移除部门成员
  async function removeMember(departmentId: string, userId: string) {
    try {
      await departmentApi.removeDepartmentMember(departmentId, userId)
      // 刷新部门信息
      if (myDepartment.value?.id === departmentId) {
        await fetchMyDepartment()
      }
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : '移除成员失败'
      throw e
    }
  }

  // 更换部门管理员
  async function changeAdmin(departmentId: string, newAdminId: string) {
    try {
      const department = await departmentApi.changeDepartmentAdmin(departmentId, newAdminId)
      const index = departments.value.findIndex(d => d.id === departmentId)
      if (index !== -1) {
        departments.value[index] = department
      }
      return department
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : '更换管理员失败'
      throw e
    }
  }

  // 清空状态
  function clearState() {
    departments.value = []
    myDepartment.value = null
    currentDepartment.value = null
    error.value = null
  }

  return {
    // 状态
    departments,
    myDepartment,
    departmentOptions,
    currentDepartment,
    loading,
    error,
    // 计算属性
    hasDepartments,
    isDepartmentAdmin,
    // 方法
    fetchDepartments,
    fetchDepartmentOptions,
    fetchMyDepartment,
    fetchDepartmentById,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    addMember,
    removeMember,
    changeAdmin,
    clearState
  }
})
