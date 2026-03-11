export type RepeatType = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
/**
 * 计算下一个重复日期
 * @param currentDate 当前日期
 * @param repeatType 重复类型
 * @returns 下一个重复日期
 */
export declare function calculateNextDueDate(currentDate: Date, repeatType: RepeatType): Date;
/**
 * 创建下一个重复任务
 * @param taskId 已完成的任务ID
 * @returns 新创建的任务或null
 */
export declare function createNextRecurringTask(taskId: string): Promise<{
    id: string;
    title: string;
    dueDate: Date;
} | null>;
/**
 * 批量处理已完成的重复任务
 * 查找所有已完成但尚未创建下一个实例的重复任务
 */
export declare function processCompletedRecurringTasks(): Promise<number>;
/**
 * 获取任务的所有重复实例
 * @param taskId 任务ID
 * @returns 重复实例列表
 */
export declare function getRecurringTaskInstances(taskId: string): Promise<{
    id: string;
    title: string;
    dueDate: Date;
    status: string;
}[]>;
//# sourceMappingURL=recurringTaskService.d.ts.map