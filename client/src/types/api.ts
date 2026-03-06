/**
 * 中集智历 - API响应类型定义
 */

// 通用API响应
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

// 分页请求参数
export interface PaginationParams {
  page?: number
  limit?: number
}

// 分页响应
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// 错误响应
export interface ErrorResponse {
  success: false
  error: string
  message: string
  statusCode: number
}
