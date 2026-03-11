/**
 * 计算部门任务统计
 */
export declare function calculateDepartmentTaskStats(departmentId: string): Promise<{
    todo: number;
    inProgress: number;
    done: number;
    cancelled: number;
    overdue: number;
}>;
/**
 * 计算部门项目统计
 */
export declare function calculateDepartmentProjectStats(departmentId: string): Promise<{
    active: number;
    completed: number;
    progress: number;
}>;
/**
 * 计算成员工作负载
 */
export declare function calculateMemberWorkload(userId: string): Promise<{
    total: number;
    todo: number;
    inProgress: number;
    done: number;
}>;
/**
 * 计算全局统计
 */
export declare function calculateGlobalStats(): Promise<{
    departments: number;
    users: number;
    projects: number;
    tasks: number;
    tasksByStatus: {
        todo: number;
        inProgress: number;
        done: number;
        cancelled: number;
    };
}>;
//# sourceMappingURL=statisticsService.d.ts.map