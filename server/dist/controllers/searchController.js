import prisma from '../config/database.js';
/**
 * 全局搜索
 * GET /api/search?keyword=xxx&types=task,project,user
 */
export async function globalSearch(req, res) {
    const userId = req.userId;
    const { keyword, types } = req.query;
    if (!keyword || keyword.length < 2) {
        res.json({
            success: true,
            data: {
                keyword: '',
                tasks: [],
                projects: [],
                users: [],
                total: 0
            }
        });
        return;
    }
    const searchKeyword = keyword;
    const searchTypes = types ? types.split(',') : ['task', 'project', 'user'];
    const results = {
        keyword: searchKeyword,
        tasks: [],
        projects: [],
        users: [],
        total: 0
    };
    // 搜索任务
    if (searchTypes.includes('task')) {
        const tasks = await prisma.task.findMany({
            where: {
                deletedAt: null,
                AND: [
                    {
                        OR: [
                            { title: { contains: searchKeyword } },
                            { description: { contains: searchKeyword } }
                        ]
                    },
                    {
                        OR: [
                            { assigneeId: userId },
                            { collaborators: { some: { userId } } },
                            { project: { members: { some: { userId } } } }
                        ]
                    }
                ]
            },
            include: {
                project: { select: { id: true, name: true } }
            },
            take: 10
        });
        results.tasks = tasks.map(task => ({
            id: task.id,
            title: task.title,
            description: task.description || undefined,
            projectName: task.project?.name,
            dueDate: task.dueDate,
            status: task.status,
            highlight: generateHighlight(task.title, searchKeyword) || generateHighlight(task.description, searchKeyword)
        }));
    }
    // 搜索项目
    if (searchTypes.includes('project')) {
        const projects = await prisma.project.findMany({
            where: {
                deletedAt: null,
                OR: [
                    {
                        AND: [
                            { visibility: 'PUBLIC' },
                            {
                                OR: [
                                    { name: { contains: searchKeyword } },
                                    { description: { contains: searchKeyword } }
                                ]
                            }
                        ]
                    },
                    {
                        AND: [
                            { members: { some: { userId } } },
                            {
                                OR: [
                                    { name: { contains: searchKeyword } },
                                    { description: { contains: searchKeyword } }
                                ]
                            }
                        ]
                    }
                ]
            },
            include: {
                _count: {
                    select: { members: true }
                }
            },
            take: 10
        });
        results.projects = projects.map(project => ({
            id: project.id,
            name: project.name,
            description: project.description || undefined,
            memberCount: project._count.members,
            visibility: project.visibility
        }));
    }
    // 搜索用户
    if (searchTypes.includes('user')) {
        const users = await prisma.user.findMany({
            where: {
                OR: [
                    { nickname: { contains: searchKeyword } },
                    { email: { contains: searchKeyword } }
                ],
                isBanned: false
            },
            select: {
                id: true,
                nickname: true,
                avatar: true,
                email: true
            },
            take: 10
        });
        results.users = users.map(user => ({
            id: user.id,
            nickname: user.nickname,
            avatar: user.avatar || undefined,
            email: user.email
        }));
    }
    results.total = results.tasks.length + results.projects.length + results.users.length;
    res.json({
        success: true,
        data: results
    });
}
/**
 * 生成高亮文本
 */
function generateHighlight(text, keyword) {
    if (!text)
        return undefined;
    const index = text.toLowerCase().indexOf(keyword.toLowerCase());
    if (index === -1)
        return undefined;
    const start = Math.max(0, index - 20);
    const end = Math.min(text.length, index + keyword.length + 20);
    let highlight = text.slice(start, end);
    if (start > 0)
        highlight = '...' + highlight;
    if (end < text.length)
        highlight = highlight + '...';
    // 添加高亮标记
    const regex = new RegExp(`(${escapeRegExp(keyword)})`, 'gi');
    highlight = highlight.replace(regex, '<em>$1</em>');
    return highlight;
}
/**
 * 转义正则表达式特殊字符
 */
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
/**
 * 搜索任务（快速搜索）
 * GET /api/search/tasks?keyword=xxx
 */
export async function searchTasks(req, res) {
    const userId = req.userId;
    const { keyword, projectId } = req.query;
    if (!keyword || keyword.length < 2) {
        res.json({
            success: true,
            data: []
        });
        return;
    }
    const searchKeyword = keyword;
    const whereClause = {
        deletedAt: null,
        AND: [
            {
                OR: [
                    { title: { contains: searchKeyword } },
                    { description: { contains: searchKeyword } }
                ]
            },
            {
                OR: [
                    { assigneeId: userId },
                    { collaborators: { some: { userId } } },
                    { project: { members: { some: { userId } } } }
                ]
            }
        ]
    };
    if (projectId) {
        whereClause.projectId = projectId;
    }
    const tasks = await prisma.task.findMany({
        where: whereClause,
        include: {
            project: { select: { id: true, name: true } },
            assignee: { select: { id: true, nickname: true } }
        },
        take: 20,
        orderBy: { updatedAt: 'desc' }
    });
    res.json({
        success: true,
        data: tasks
    });
}
/**
 * 搜索项目（快速搜索）
 * GET /api/search/projects?keyword=xxx
 */
export async function searchProjects(req, res) {
    const userId = req.userId;
    const { keyword } = req.query;
    if (!keyword || keyword.length < 2) {
        res.json({
            success: true,
            data: []
        });
        return;
    }
    const searchKeyword = keyword;
    const projects = await prisma.project.findMany({
        where: {
            deletedAt: null,
            OR: [
                {
                    AND: [
                        { visibility: 'PUBLIC' },
                        {
                            OR: [
                                { name: { contains: searchKeyword } },
                                { description: { contains: searchKeyword } }
                            ]
                        }
                    ]
                },
                {
                    AND: [
                        { members: { some: { userId } } },
                        {
                            OR: [
                                { name: { contains: searchKeyword } },
                                { description: { contains: searchKeyword } }
                            ]
                        }
                    ]
                }
            ]
        },
        include: {
            owner: { select: { id: true, nickname: true } },
            _count: {
                select: { members: true, tasks: true }
            }
        },
        take: 20,
        orderBy: { updatedAt: 'desc' }
    });
    res.json({
        success: true,
        data: projects
    });
}
//# sourceMappingURL=searchController.js.map