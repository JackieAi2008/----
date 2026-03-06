/**
 * 中集智历 - 用户类型定义
 */

// 用户基础信息
export interface User {
  id: string
  email: string
  nickname: string
  avatar: string | null
  bio: string | null
  isAdmin: boolean
  isBanned: boolean
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
  { index: 0, question: '您的母亲姓名是什么？' },
  { index: 1, question: '您的出生城市是哪里？' },
  { index: 2, question: '您的第一所学校名称是什么？' },
  { index: 3, question: '您最喜爱的电影是什么？' }
]
