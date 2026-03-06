/**
 * 中集智历 - Axios请求封装
 */
import axios from 'axios'
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import type { ApiResponse } from '@/types/api'
import { devLog } from '@/utils/logger'

// 创建axios实例
const request: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    // 从localStorage获取token
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
request.interceptors.response.use(
  (response: AxiosResponse) => {
    return response.data
  },
  (error) => {
    // 处理错误响应
    if (error.response) {
      const { status } = error.response

      if (status === 401) {
        // 未授权，清除token并跳转登录页
        localStorage.removeItem('token')
        window.location.href = '/login'
      } else if (status === 403) {
        // 无权限
        devLog.error('无权限访问')
      } else if (status === 404) {
        // 资源不存在
        devLog.error('资源不存在')
      } else if (status >= 500) {
        // 服务器错误
        devLog.error('服务器错误')
      }
    }

    return Promise.reject(error)
  }
)

// GET请求
export function get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
  return request.get(url, config)
}

// POST请求
export function post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
  return request.post(url, data, config)
}

// PUT请求
export function put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
  return request.put(url, data, config)
}

// DELETE请求
export function del<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
  return request.delete(url, config)
}

export default request
