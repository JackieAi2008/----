/**
 * 中集智历 - 请求限流中间件
 */
import rateLimit from 'express-rate-limit'

/**
 * 通用API限流
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 每个IP最多100次请求
  message: {
    success: false,
    message: '请求过于频繁，请稍后再试'
  },
  standardHeaders: true,
  legacyHeaders: false
})

/**
 * 认证接口限流（更严格）
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 50, // 每个IP最多50次请求
  message: {
    success: false,
    message: '登录尝试次数过多，请15分钟后再试'
  },
  standardHeaders: true,
  legacyHeaders: false
})

/**
 * AI总结接口限流
 * 每用户每分钟最多3次请求，避免频繁调用消耗API额度
 */
export const aiSummaryLimiter = rateLimit({
  windowMs: 60 * 1000, // 1分钟
  max: 3,
  keyGenerator: (req: any) => req.userId || req.ip,
  message: {
    success: false,
    message: 'AI总结请求过于频繁，请1分钟后再试'
  },
  standardHeaders: true,
  legacyHeaders: false
})
