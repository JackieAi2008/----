/**
 * 中集智历 - 部门类型定义
 */

// 部门基础信息
export interface Department {
  id: string
  name: string
  description: string | null
  adminId: string
  admin?: { id: string; nickname: string; email: string; avatar?: string | null }
  memberCount?: number
  projectCount?: number
  members?: { id: string; nickname: string; email: string; avatar?: string | null }[]
  projects?: { id: string; name: string }[]
  createdAt: string
  updatedAt?: string
}

// 创建部门请求
export interface CreateDepartmentRequest {
  name: string
  description?: string
  adminId: string
}

// 更新部门请求
export interface UpdateDepartmentRequest {
  name?: string
  description?: string
}

// 添加成员请求
export interface AddMemberRequest {
  userId: string
}

// 更换管理员请求
export interface ChangeAdminRequest {
  newAdminId: string
}

// 删除部门请求
export interface DeleteDepartmentRequest {
  targetDepartmentId?: string
}

// 部门选项（用于下拉选择）
export interface DepartmentOption {
  id: string
  name: string
}
