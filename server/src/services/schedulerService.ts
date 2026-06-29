/**
 * 中集智历 - 定时任务调度服务
 * 使用 Node.js 内置定时器处理周期性任务
 */
import { processCompletedRecurringTasks } from './recurringTaskService.js'
import { runLibraryCleanupNow } from '../jobs/libraryCleanupJob.js'
import { logger } from '../utils/logger.js'

// 存储定时器引用
let recurringTaskTimer: NodeJS.Timeout | null = null
let libraryCleanupTimer: NodeJS.Timeout | null = null

/**
 * 启动定时任务调度器
 */
export function startScheduler(): void {
  // 每小时检查一次已完成的重复任务
  const ONE_HOUR = 60 * 60 * 1000
  // 资料库 30 天硬删: 每日 03:00 跑一次
  const ONE_DAY = 24 * ONE_HOUR

  // 立即执行一次
  runRecurringTaskCheck()

  // 设置定时器
  recurringTaskTimer = setInterval(async () => {
    await runRecurringTaskCheck()
  }, ONE_HOUR)

  // 资料库清理: 用 setInterval 每 24h 跑一次
  // (生产可换 cron, 但 ECS 上 systemd timer 比 node-cron 简单)
  // 启动时跑一次, 然后 24h 间隔
  libraryCleanupTimer = setInterval(async () => {
    try {
      await runLibraryCleanupNow()
    } catch (e) {
      logger.error('资料库 30 天定时清理失败 (下次再试)', e)
    }
  }, ONE_DAY)

  logger.info('定时任务调度器已启动')
}

/**
 * 停止定时任务调度器
 */
export function stopScheduler(): void {
  if (recurringTaskTimer) {
    clearInterval(recurringTaskTimer)
    recurringTaskTimer = null
  }
  if (libraryCleanupTimer) {
    clearInterval(libraryCleanupTimer)
    libraryCleanupTimer = null
  }
  logger.info('定时任务调度器已停止')
}

/**
 * 执行重复任务检查
 */
async function runRecurringTaskCheck(): Promise<void> {
  try {
    logger.debug('开始检查重复任务...')
    const count = await processCompletedRecurringTasks()
    if (count > 0) {
      logger.info(`重复任务检查完成，创建了 ${count} 个新任务`)
    }
  } catch (error) {
    logger.error('重复任务检查失败', error)
  }
}

/**
 * 手动触发重复任务检查
 */
export async function manualRecurringTaskCheck(): Promise<number> {
  logger.info('手动触发重复任务检查')
  return await processCompletedRecurringTasks()
}

/**
 * 手动触发资料库 30 天清理 (供 verifier / 运维 CLI 调)
 */
export async function manualLibraryCleanup() {
  return await runLibraryCleanupNow()
}
