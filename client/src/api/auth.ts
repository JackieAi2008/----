/**
 * 中集智历 - 认证相关API
 */
import { get, post } from '@/utils/request'
import type {
  User,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  ChangePasswordRequest,
  ResetPasswordRequest
} from '@/types/user'

/**
 * 用户登录
 */
export async function login(data: LoginRequest): Promise<LoginResponse> {
  const response = await post<LoginResponse>('/auth/login', data)
  return response.data!
}

/**
 * 用户注册
 */
export async function register(data: RegisterRequest): Promise<LoginResponse> {
  const response = await post<LoginResponse>('/auth/register', data)
  return response.data!
}

/**
 * 获取当前用户信息
 */
export async function getCurrentUser(): Promise<User> {
  const response = await get<User>('/auth/me')
  return response.data!
}

/**
 * 修改密码
 */
export async function changePassword(data: ChangePasswordRequest): Promise<void> {
  await post('/auth/change-password', data)
}

/**
 * 重置密码
 */
export async function resetPassword(data: ResetPasswordRequest): Promise<void> {
  await post('/auth/reset-password', data)
}

/**
 * 验证安全问题
 */
export async function verifySecurityQuestion(
  email: string,
  questionIndex: number,
  answer: string
): Promise<boolean> {
  const response = await post<{ valid: boolean }>('/auth/verify-security', {
    email,
    questionIndex,
    answer
  })
  return response.data?.valid ?? false
}

/**
 * 获取用户的安全问题
 */
export async function getSecurityQuestion(email: string): Promise<{ questionIndex: number }> {
  const response = await get<{ questionIndex: number }>(`/auth/security-question/${encodeURIComponent(email)}`)
  return response.data!
}
