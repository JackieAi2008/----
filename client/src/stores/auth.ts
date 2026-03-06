/**
 * 中集智历 - 用户认证状态管理
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User } from '@/types/user'
import * as authApi from '@/api/auth'

export const useAuthStore = defineStore('auth', () => {
  // 状态
  const user = ref<User | null>(null)
  const token = ref<string | null>(localStorage.getItem('token'))

  // 计算属性
  const isAuthenticated = computed(() => !!token.value)
  const isAdmin = computed(() => user.value?.isAdmin ?? false)

  // 登录
  async function login(email: string, password: string) {
    const response = await authApi.login({ email, password })
    token.value = response.token
    user.value = response.user
    localStorage.setItem('token', response.token)
    return response
  }

  // 注册
  async function register(data: {
    email: string
    password: string
    nickname: string
    securityQuestion: number
    securityAnswer: string
  }) {
    const response = await authApi.register(data)
    token.value = response.token
    user.value = response.user
    localStorage.setItem('token', response.token)
    return response
  }

  // 登出
  function logout() {
    user.value = null
    token.value = null
    localStorage.removeItem('token')
  }

  // 获取当前用户信息
  async function fetchCurrentUser() {
    if (!token.value) return null
    try {
      const response = await authApi.getCurrentUser()
      user.value = response
      return response
    } catch {
      logout()
      return null
    }
  }

  // 修改密码
  async function changePassword(oldPassword: string, newPassword: string) {
    await authApi.changePassword({ oldPassword, newPassword })
  }

  // 设置用户信息
  function setUser(userData: User) {
    user.value = userData
  }

  return {
    user,
    token,
    isAuthenticated,
    isAdmin,
    login,
    register,
    logout,
    fetchCurrentUser,
    changePassword,
    setUser
  }
})
