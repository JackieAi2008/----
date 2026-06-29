/**
 * 中集智历 - 资料库 30 天回收站清理 (r1 §6a B6)
 *
 * 任务: 每天扫一次 `deletedAt < now - 30天` 的资产, 物理删除
 *       (DB 行 + 磁盘文件) + 释放配额
 *
 * 设计 doc §6 风险登记 "回收站磁盘空间" 风险: 本函数失败不致命,
 * 由 P2 磁盘监控兜底
 */
import { cleanupExpiredSoftDeleted, CleanupResult } from '../services/libraryService.js'
import { logger } from '../utils/logger.js'

/**
 * 手动触发一次清理 (CLI / API 端点)
 */
export async function runLibraryCleanupNow(): Promise<CleanupResult> {
  const start = Date.now()
  logger.info('资料库 30 天清理任务开始')
  try {
    const result = await cleanupExpiredSoftDeleted()
    const ms = Date.now() - start
    logger.info(`资料库 30 天清理完成 (${ms}ms)`, result as unknown as Record<string, unknown>)
    return result
  } catch (e) {
    logger.error('资料库 30 天清理失败', e)
    throw e
  }
}
