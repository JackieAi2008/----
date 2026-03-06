/**
 * 中集智历 - 错误处理中间件
 */
import { Request, Response, NextFunction } from 'express'

/**
 * 自定义API错误类
 */
export class ApiError extends Error {
  statusCode: number
  code?: string

  constructor(statusCode: number, message: string, code?: string) {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.name = 'ApiError'
  }
}

/**
 * 错误处理中间件
 */
export function errorHandler(
  err: Error | ApiError,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error('Error:', err)

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.code
    })
  }

  // Prisma错误处理
  if (err.constructor.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as unknown as { code: string; meta?: { target?: string[] } }
    if (prismaError.code === 'P2002') {
      return res.status(400).json({
        success: false,
        message: `${prismaError.meta?.target?.[0] || '字段'}已存在`
      })
    }
    if (prismaError.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: '资源不存在'
      })
    }
  }

  // 默认服务器错误
  return res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? '服务器内部错误' : err.message
  })
}
