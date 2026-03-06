/**
 * 中集智历 - 前端日志工具
 * 只在开发环境输出日志
 */

const isDev = import.meta.env.DEV

export const devLog = {
  log(...args: unknown[]) {
    if (isDev) {
      console.log(...args)
    }
  },

  error(...args: unknown[]) {
    if (isDev) {
      console.error(...args)
    }
  },

  warn(...args: unknown[]) {
    if (isDev) {
      console.warn(...args)
    }
  },

  info(...args: unknown[]) {
    if (isDev) {
      console.info(...args)
    }
  }
}
