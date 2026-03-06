/**
 * 中集智历 - JWT工具函数
 */
import jwt from 'jsonwebtoken'
import { jwtConfig } from '../config/jwt.js'

interface TokenPayload {
  userId: string
  role: string
}

/**
 * 生成JWT Token
 */
export function generateToken(payload: TokenPayload): string {
  // 使用固定的expiresIn值避免类型问题
  return jwt.sign(payload, jwtConfig.secret, { expiresIn: '7d' })
}

/**
 * 验证JWT Token
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, jwtConfig.secret) as TokenPayload
  } catch {
    return null
  }
}
