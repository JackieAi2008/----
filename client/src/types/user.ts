/**
 * 中集智历 - 用户类型定义
 */

// 部门信息
export interface Department {
  id: string
  name: string
  description?: string
  adminId?: string
  admin?: User
  memberCount?: number
  projectCount?: number
  createdAt: string
}

// 用户基础信息
export interface User {
  id: string
  email: string
  nickname: string
  avatar: string | null
  bio: string | null
  isAdmin: boolean
  isBanned: boolean
  isDepartmentAdmin?: boolean
  departmentId?: string
  department?: Department
  managedDepartment?: Department
  createdAt: string
  updatedAt: string
}

// 登录请求
export interface LoginRequest {
  email: string
  password: string
}

// 注册请求
export interface RegisterRequest {
  email: string
  password: string
  nickname: string
  securityQuestion: number
  securityAnswer: string
  departmentId?: string
}

// 登录响应
export interface LoginResponse {
  token: string
  user: User
}

// 修改密码请求
export interface ChangePasswordRequest {
  oldPassword: string
  newPassword: string
}

// 重置密码请求
export interface ResetPasswordRequest {
  email: string
  securityQuestion: number
  securityAnswer: string
  newPassword: string
}

// 安全问题
export interface SecurityQuestion {
  index: number
  question: string
}

// 预设安全问题列表
export const SECURITY_QUESTIONS: SecurityQuestion[] = [
  { index: 0, question: '您的幸运数字是什么？' },
  { index: 1, question: '您的出生城市是哪里？' },
  { index: 2, question: '您的第一所学校名称是什么？' },
  { index: 3, question: '您最喜爱的电影是什么？' }
]
