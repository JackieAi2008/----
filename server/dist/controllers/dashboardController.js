import prisma from '../config/database.js';
/**
 * 获取仪表盘数据
 */
export async function getDashboard(req, res) {
    const userId = req.userId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const threeDaysLater = new Date(today);
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);
    const weekLater = new Date(today);
    weekLater.setDate(weekLater.getDate() + 7);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    // 并行获取所有数据
    const [todayTasks, overdueTasks, upcomingTasks, weekTasks, monthStats, projectCount, recentProjects] = await Promise.all([
        // 今日待办
        prisma.task.findMany({
            where: {
                OR: [
                    { assigneeId: userId },
                    { collaborators: { some: { userId } } }
                ],
                dueDate: { gte: today, lt: tomorrow },
                status: { notIn: ['DONE', 'CANCELLED'] },
                deletedAt: null
            },
            include: {
                project: { select: { id: true, name: true } },
                category: { select: { id: true, name: true, color: true } }
            },
            orderBy: { dueDate: 'asc' }
        }),
        // 逾期任务
        prisma.task.findMany({
            where: {
                OR: [
                    { assigneeId: userId },
                    { collaborators: { some: { userId } } }
                ],
                dueDate: { lt: today },
                status: { notIn: ['DONE', 'CANCELLED'] },
                deletedAt: null
            },
            include: {
                project: { select: { id: true, name: true } },
                category: { select: { id: true, name: true, color: true } }
            },
            orderBy: { dueDate: 'asc' },
            take: 10
        }),
        // 即将到期（3天内）
        prisma.task.findMany({
            where: {
                OR: [
                    { assigneeId: userId },
                    { collaborators: { some: { userId } } }
                ],
                dueDate: { gte: tomorrow, lt: threeDaysLater },
                status: { notIn: ['DONE', 'CANCELLED'] },
                deletedAt: null
            },
            include: {
                project: { select: { id: true, name: true } },
                category: { select: { id: true, name: true, color: true } }
            },
            orderBy: { dueDate: 'asc' },
            take: 10
        }),
        // 本周任务统计（只统计公开任务）
        prisma.task.count({
            where: {
                OR: [
                    { assigneeId: userId },
                    { collaborators: { some: { userId } } }
                ],
                dueDate: { gte: today, lt: weekLater },
                deletedAt: null,
                visibility: 'PUBLIC'
            }
        }),
        // 本月统计（只统计公开任务）
        prisma.task.groupBy({
            by: ['status'],
            where: {
                OR: [
                    { assigneeId: userId },
                    { collaborators: { some: { userId } } }
                ],
                dueDate: { gte: monthStart, lte: monthEnd },
                deletedAt: null,
                visibility: 'PUBLIC'
            },
            _count: true
        }),
        // 参与的项目数
        prisma.projectMember.count({
            where: { userId }
        }),
        // 最近项目
        prisma.project.findMany({
            where: {
                members: { some: { userId } },
                deletedAt: null
            },
            include: {
                owner: { select: { id: true, nickname: true, avatar: true } },
                _count: { select: { tasks: { where: { deletedAt: null } } } }
            },
            orderBy: { updatedAt: 'desc' },
            take: 5
        })
    ]);
    // 计算本月完成率
    const monthTotal = monthStats.reduce((sum, s) => sum + s._count, 0);
    const monthDone = monthStats.find(s => s.status === 'DONE')?._count || 0;
    const completionRate = monthTotal > 0 ? Math.round((monthDone / monthTotal) * 100) : 0;
    res.json({
        success: true,
        data: {
            todayTasks,
            overdueTasks,
            upcomingTasks,
            weekTasksCount: weekTasks,
            monthStats: {
                total: monthTotal,
                done: monthDone,
                completionRate
            },
            projectCount,
            recentProjects
        }
    });
}
/**
 * 获取工作统计
 */
export async function getWorkStats(req, res) {
    const userId = req.userId;
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date();
    start.setDate(start.getDate() - 30);
    start.setHours(0, 0, 0, 0);
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);
    // 按状态统计（按创建时间筛选，包含在时间段内创建的所有任务）
    const statusStatsRaw = await prisma.task.groupBy({
        by: ['status'],
        where: {
            OR: [
                { assigneeId: userId },
                { collaborators: { some: { userId } } }
            ],
            createdAt: { gte: start, lte: end },
            deletedAt: null
        },
        _count: true
    });
    // 转换字段名：_count -> count
    const statusStats = statusStatsRaw.map(s => ({
        status: s.status,
        count: s._count
    }));
    // 按项目统计
    const projectStats = await prisma.task.groupBy({
        by: ['projectId'],
        where: {
            OR: [
                { assigneeId: userId },
                { collaborators: { some: { userId } } }
            ],
            createdAt: { gte: start, lte: end },
            deletedAt: null
        },
        _count: true
    });
    // 获取项目名称
    const projectIds = projectStats.map(s => s.projectId);
    const projects = await prisma.project.findMany({
        where: { id: { in: projectIds } },
        select: { id: true, name: true }
    });
    const projectStatsWithName = projectStats.map(s => ({
        projectId: s.projectId,
        projectName: projects.find(p => p.id === s.projectId)?.name || '未知项目',
        count: s._count
    }));
    res.json({
        success: true,
        data: {
            statusStats,
            projectStats: projectStatsWithName,
            dateRange: {
                start: start.toISOString(),
                end: end.toISOString()
            }
        }
    });
}
//# sourceMappingURL=dashboardController.js.map