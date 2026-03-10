/**
 * 中集智历 - 部门相关API
 */
import { get, post, put, del } from '@/utils/request'
import type { Department, DepartmentOption, CreateDepartmentRequest, UpdateDepartmentRequest, DeleteDepartmentRequest } from '@/types/department'
import type { User } from '@/types/user'

/**
 * 获取所有部门列表（系统管理员）
 */
export async function getDepartments(): Promise<Department[]> {
  const response = await get<Department[]>('/departments')
  return response.data || []
}

/**
 * 获取部门选项列表（用于下拉选择）
 */
export async function getDepartmentOptions(): Promise<DepartmentOption[]> {
  const response = await get<DepartmentOption[]>('/departments/options')
  return response.data || []
}

/**
 * 获取我管理的部门
 */
export async function getMyDepartment(): Promise<Department | null> {
  try {
    const response = await get<Department>('/departments/my')
    return response.data || null
  } catch {
    return null
  }
}

/**
 * 获取部门详情
 */
export async function getDepartmentById(id: string): Promise<Department> {
  const response = await get<Department>(`/departments/${id}`)
  return response.data!
}

/**
 * 创建部门
 */
export async function createDepartment(data: CreateDepartmentRequest): Promise<Department> {
  const response = await post<Department>('/departments', data)
  return response.data!
}

/**
 * 更新部门信息
 */
export async function updateDepartment(id: string, data: UpdateDepartmentRequest): Promise<Department> {
  const response = await put<Department>(`/departments/${id}`, data)
  return response.data!
}

/**
 * 删除部门
 */
export async function deleteDepartment(id: string, data?: DeleteDepartmentRequest): Promise<void> {
  await del(`/departments/${id}`, data ? { data } : undefined)
}

/**
 * 添加部门成员
 */
export async function addDepartmentMember(departmentId: string, userId: string): Promise<void> {
  await post(`/departments/${departmentId}/members`, { userId })
}

/**
 * 移除部门成员
 */
export async function removeDepartmentMember(departmentId: string, userId: string): Promise<void> {
  await del(`/departments/${departmentId}/members/${userId}`)
}

/**
 * 更换部门管理员
 */
export async function changeDepartmentAdmin(departmentId: string, newAdminId: string): Promise<Department> {
  const response = await put<Department>(`/departments/${departmentId}/admin`, { newAdminId })
  return response.data!
}

/**
 * 搜索用户（用于添加成员）
 */
export async function searchUsersForDepartment(keyword: string, departmentId?: string): Promise<User[]> {
  const params = new URLSearchParams({ keyword })
  if (departmentId) {
    params.append('departmentId', departmentId)
  }
  const response = await get<User[]>(`/users/search?${params.toString()}`)
  return response.data || []
}
