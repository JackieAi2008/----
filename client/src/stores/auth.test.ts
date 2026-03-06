/**
 * 认证状态管理测试
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from './auth'
import * as authApi from '@/api/auth'

// Mock auth API
vi.mock('@/api/auth', () => ({
  login: vi.fn(),
  register: vi.fn(),
  getCurrentUser: vi.fn(),
  changePassword: vi.fn()
}))

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    })
  }
})()

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock
})

describe('auth store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('初始状态', () => {
    it('初始时用户应为 null', () => {
      const store = useAuthStore()
      expect(store.user).toBeNull()
    })

    it('初始时 token 应从 localStorage 读取', () => {
      localStorageMock.setItem('token', 'existing-token')
      setActivePinia(createPinia())
      const store = useAuthStore()
      expect(store.token).toBe('existing-token')
    })
  })

  describe('计算属性', () => {
    it('isAuthenticated 有 token 时应为 true', () => {
      const store = useAuthStore()
      store.token = 'test-token'
      expect(store.isAuthenticated).toBe(true)
    })

    it('isAuthenticated 无 token 时应为 false', () => {
      const store = useAuthStore()
      store.token = null
      expect(store.isAuthenticated).toBe(false)
    })

    it('isAdmin 当用户是管理员时应为 true', () => {
      const store = useAuthStore()
      store.user = { id: 1, email: 'admin@test.com', nickname: 'Admin', isAdmin: true } as any
      expect(store.isAdmin).toBe(true)
    })

    it('isAdmin 当用户不是管理员时应为 false', () => {
      const store = useAuthStore()
      store.user = { id: 1, email: 'user@test.com', nickname: 'User', isAdmin: false } as any
      expect(store.isAdmin).toBe(false)
    })

    it('isAdmin 当用户为 null 时应为 false', () => {
      const store = useAuthStore()
      store.user = null
      expect(store.isAdmin).toBe(false)
    })
  })

  describe('login', () => {
    it('登录成功应设置 token 和用户信息', async () => {
      const mockResponse = {
        token: 'mock-token',
        user: { id: 1, email: 'test@test.com', nickname: 'Test User' }
      }
      vi.mocked(authApi.login).mockResolvedValue(mockResponse as any)

      const store = useAuthStore()
      const result = await store.login('test@test.com', 'password')

      expect(authApi.login).toHaveBeenCalledWith({ email: 'test@test.com', password: 'password' })
      expect(store.token).toBe('mock-token')
      expect(store.user).toEqual(mockResponse.user)
      expect(localStorageMock.setItem).toHaveBeenCalledWith('token', 'mock-token')
      expect(result).toEqual(mockResponse)
    })
  })

  describe('register', () => {
    it('注册成功应设置 token 和用户信息', async () => {
      const mockResponse = {
        token: 'mock-token',
        user: { id: 1, email: 'new@test.com', nickname: 'New User' }
      }
      vi.mocked(authApi.register).mockResolvedValue(mockResponse as any)

      const store = useAuthStore()
      const registerData = {
        email: 'new@test.com',
        password: 'password',
        nickname: 'New User',
        securityQuestion: 1,
        securityAnswer: 'answer'
      }
      const result = await store.register(registerData)

      expect(authApi.register).toHaveBeenCalledWith(registerData)
      expect(store.token).toBe('mock-token')
      expect(store.user).toEqual(mockResponse.user)
      expect(result).toEqual(mockResponse)
    })
  })

  describe('logout', () => {
    it('登出应清除用户信息和 token', () => {
      const store = useAuthStore()
      store.user = { id: 1, email: 'test@test.com' } as any
      store.token = 'test-token'

      store.logout()

      expect(store.user).toBeNull()
      expect(store.token).toBeNull()
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('token')
    })
  })

  describe('fetchCurrentUser', () => {
    it('有 token 时应获取用户信息', async () => {
      const mockUser = { id: 1, email: 'test@test.com', nickname: 'Test User' }
      vi.mocked(authApi.getCurrentUser).mockResolvedValue(mockUser as any)

      const store = useAuthStore()
      store.token = 'test-token'
      const result = await store.fetchCurrentUser()

      expect(authApi.getCurrentUser).toHaveBeenCalled()
      expect(store.user).toEqual(mockUser)
      expect(result).toEqual(mockUser)
    })

    it('无 token 时应返回 null', async () => {
      const store = useAuthStore()
      store.token = null
      const result = await store.fetchCurrentUser()

      expect(authApi.getCurrentUser).not.toHaveBeenCalled()
      expect(result).toBeNull()
    })

    it('获取失败时应登出并返回 null', async () => {
      vi.mocked(authApi.getCurrentUser).mockRejectedValue(new Error('Unauthorized'))

      const store = useAuthStore()
      store.token = 'invalid-token'
      const result = await store.fetchCurrentUser()

      expect(store.user).toBeNull()
      expect(store.token).toBeNull()
      expect(result).toBeNull()
    })
  })

  describe('changePassword', () => {
    it('应调用 changePassword API', async () => {
      vi.mocked(authApi.changePassword).mockResolvedValue()

      const store = useAuthStore()
      await store.changePassword('oldPassword', 'newPassword')

      expect(authApi.changePassword).toHaveBeenCalledWith({
        oldPassword: 'oldPassword',
        newPassword: 'newPassword'
      })
    })
  })

  describe('setUser', () => {
    it('应设置用户信息', () => {
      const store = useAuthStore()
      const user = { id: 1, email: 'test@test.com', nickname: 'Test' }
      store.setUser(user as any)

      expect(store.user).toEqual(user)
    })
  })
})
