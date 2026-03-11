/**
 * 中集智历 - 定时任务调度服务
 * 使用 Node.js 内置定时器处理周期性任务
 */
import { processCompletedRecurringTasks } from './recurringTaskService.js';
import { logger } from '../utils/logger.js';
// 存储定时器引用
let recurringTaskTimer = null;
/**
 * 启动定时任务调度器
 */
export function startScheduler() {
    // 每小时检查一次已完成的重复任务
    const ONE_HOUR = 60 * 60 * 1000;
    // 立即执行一次
    runRecurringTaskCheck();
    // 设置定时器
    recurringTaskTimer = setInterval(async () => {
        await runRecurringTaskCheck();
    }, ONE_HOUR);
    logger.info('定时任务调度器已启动');
}
/**
 * 停止定时任务调度器
 */
export function stopScheduler() {
    if (recurringTaskTimer) {
        clearInterval(recurringTaskTimer);
        recurringTaskTimer = null;
        logger.info('定时任务调度器已停止');
    }
}
/**
 * 执行重复任务检查
 */
async function runRecurringTaskCheck() {
    try {
        logger.debug('开始检查重复任务...');
        const count = await processCompletedRecurringTasks();
        if (count > 0) {
            logger.info(`重复任务检查完成，创建了 ${count} 个新任务`);
        }
    }
    catch (error) {
        logger.error('重复任务检查失败', error);
    }
}
/**
 * 手动触发重复任务检查
 */
export async function manualRecurringTaskCheck() {
    logger.info('手动触发重复任务检查');
    return await processCompletedRecurringTasks();
}
//# sourceMappingURL=schedulerService.js.map