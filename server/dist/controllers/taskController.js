import prisma from '../config/database.js';
import { ApiError } from '../middlewares/errorHandler.js';
import { getTaskPermissions } from '../middlewares/taskPermission.js';
/**
 * 获取任务列表
 */
export async function getTasks(req, res) {
    const userId = req.userId;
    const { projectId, assigneeId, status, startDate, endDate } = req.query;
    // 构建查询条件
    const where = {
        deletedAt: null
    };
    if (projectId) {
        where.projectId = projectId;
    }
    if (assigneeId) {
        where.assigneeId = assigneeId;
    }
    if (status) {
        where.status = status;
    }
    if (startDate || endDate) {
        where.dueDate = {};
        if (startDate) {
            where.dueDate.gte = new Date(startDate);
        }
        if (endDate) {
            where.dueDate.lte = new Date(endDate);
        }
    }
    // 如果没有指定项目，只返回用户有权限的任务
    if (!projectId) {
        where.OR = [
            { assigneeId: userId },
            { collaborators: { some: { userId } } },
            { project: { members: { some: { userId } } } }
        ];
    }
    const tasks = await prisma.task.findMany({
        where,
        include: {
            project: {
                select: { id: true, name: true }
            },
            category: true,
            assignee: {
                select: { id: true, nickname: true, avatar: true }
            },
            creator: {
                select: { id: true, nickname: true }
            },
            collaborators: {
                include: {
                    user: {
                        select: { id: true, nickname: true, avatar: true }
                    }
                }
            }
        },
        orderBy: { dueDate: 'asc' }
    });
    res.json({
        success: true,
        data: tasks
    });
}
/**
 * 获取任务详情
 */
export async function getTaskById(req, res) {
    const { id } = req.params;
    const userId = req.userId;
    const task = await prisma.task.findFirst({
        where: { id, deletedAt: null },
        include: {
            project: {
                select: { id: true, name: true, ownerId: true }
            },
            category: true,
            assignee: {
                select: { id: true, nickname: true, avatar: true }
            },
            creator: {
                select: { id: true, nickname: true }
            },
            collaborators: {
                include: {
                    user: {
                        select: { id: true, nickname: true, avatar: true }
                    }
                }
            },
            comments: {
                where: { deletedAt: null },
                include: {
                    user: {
                        select: { id: true, nickname: true, avatar: true }
                    }
                },
                orderBy: { createdAt: 'desc' }
            },
            attachments: {
                include: {
                    uploader: {
                        select: { id: true, nickname: true }
                    }
                }
            }
        }
    });
    if (!task) {
        throw new ApiError(404, '任务不存在');
    }
    // 获取权限信息
    const permissions = userId ? await getTaskPermissions(userId, id) : null;
    res.json({
        success: true,
        data: {
            ...task,
            permissions
        }
    });
}
/**
 * 创建任务
 */
export async function createTask(req, res) {
    const userId = req.userId;
    const { projectId, title, description, startDate, dueDate, categoryId, assigneeId, priority, deliverable, tags, reminder, repeat, collaboratorIds } = req.body;
    // 检查项目权限
    const member = await prisma.projectMember.findUnique({
        where: {
            projectId_userId: { projectId, userId: userId }
        }
    });
    if (!member) {
        throw new ApiError(403, '无权在该项目中创建任务');
    }
    // 创建任务
    const task = await prisma.task.create({
        data: {
            projectId,
            title,
            description,
            startDate: startDate ? new Date(startDate) : null,
            dueDate: new Date(dueDate),
            categoryId,
            assigneeId,
            priority: priority || 'MEDIUM',
            status: 'TODO',
            deliverable,
            tags: tags ? JSON.stringify(tags) : null,
            reminder,
            repeat,
            creatorId: userId,
            collaborators: collaboratorIds ? {
                create: collaboratorIds.map(id => ({
                    userId: id
                }))
            } : undefined
        },
        include: {
            project: {
                select: { id: true, name: true }
            },
            category: true,
            assignee: {
                select: { id: true, nickname: true, avatar: true }
            }
        }
    });
    // 发送通知给负责人
    if (assigneeId && assigneeId !== userId) {
        await prisma.notification.create({
            data: {
                userId: assigneeId,
                type: 'TASK_ASSIGNED',
                title: '新任务指派',
                content: `您被指派了新任务「${title}」`,
                relatedType: 'TASK',
                relatedId: task.id
            }
        });
    }
    // 发送通知给协作者
    if (collaboratorIds && collaboratorIds.length > 0) {
        const notifications = collaboratorIds
            .filter(id => id !== userId && id !== assigneeId)
            .map(id => ({
            userId: id,
            type: 'TASK_COLLABORATOR',
            title: '协作任务邀请',
            content: `您被邀请协作任务「${title}」`,
            relatedType: 'TASK',
            relatedId: task.id
        }));
        if (notifications.length > 0) {
            await prisma.notification.createMany({ data: notifications });
        }
    }
    res.status(201).json({
        success: true,
        data: task
    });
}
/**
 * 更新任务
 */
export async function updateTask(req, res) {
    const { id } = req.params;
    const userId = req.userId;
    const { title, description, startDate, dueDate, categoryId, assigneeId, priority, status, deliverable, tags, reminder, repeat } = req.body;
    // 检查任务是否存在
    const task = await prisma.task.findFirst({
        where: { id, deletedAt: null }
    });
    if (!task) {
        throw new ApiError(404, '任务不存在');
    }
    // 检查权限
    const member = await prisma.projectMember.findUnique({
        where: {
            projectId_userId: { projectId: task.projectId, userId: userId }
        }
    });
    if (!member) {
        throw new ApiError(403, '无权修改该任务');
    }
    const updatedTask = await prisma.task.update({
        where: { id },
        data: {
            title,
            description,
            startDate: startDate ? new Date(startDate) : null,
            dueDate: dueDate ? new Date(dueDate) : undefined,
            categoryId,
            assigneeId,
            priority,
            status,
            deliverable,
            tags: tags ? JSON.stringify(tags) : undefined,
            reminder,
            repeat
        },
        include: {
            project: {
                select: { id: true, name: true }
            },
            category: true,
            assignee: {
                select: { id: true, nickname: true, avatar: true }
            }
        }
    });
    res.json({
        success: true,
        data: updatedTask
    });
}
/**
 * 更新任务状态（负责人、协作者也可以更新）
 */
export async function updateTaskStatus(req, res) {
    const { id } = req.params;
    const { status } = req.body;
    // 检查任务是否存在
    const task = await prisma.task.findFirst({
        where: { id, deletedAt: null }
    });
    if (!task) {
        throw new ApiError(404, '任务不存在');
    }
    // 权限检查已在中间件中完成
    const updatedTask = await prisma.task.update({
        where: { id },
        data: { status },
        include: {
            project: {
                select: { id: true, name: true }
            },
            assignee: {
                select: { id: true, nickname: true, avatar: true }
            }
        }
    });
    res.json({
        success: true,
        data: updatedTask
    });
}
/**
 * 删除任务（软删除）
 */
export async function deleteTask(req, res) {
    const { id } = req.params;
    const userId = req.userId;
    const task = await prisma.task.findFirst({
        where: { id, deletedAt: null }
    });
    if (!task) {
        throw new ApiError(404, '任务不存在');
    }
    // 检查权限
    const member = await prisma.projectMember.findUnique({
        where: {
            projectId_userId: { projectId: task.projectId, userId: userId }
        }
    });
    if (!member) {
        throw new ApiError(403, '无权删除该任务');
    }
    await prisma.task.update({
        where: { id },
        data: { deletedAt: new Date() }
    });
    res.json({
        success: true,
        message: '任务已删除'
    });
}
/**
 * 获取任务类别列表
 */
export async function getTaskCategories(req, res) {
    const { projectId } = req.query;
    const categories = await prisma.taskCategory.findMany({
        where: {
            OR: [
                { isSystem: true },
                { projectId: projectId }
            ]
        },
        orderBy: [
            { isSystem: 'desc' },
            { name: 'asc' }
        ]
    });
    res.json({
        success: true,
        data: categories
    });
}
/**
 * 创建任务类别
 */
export async function createTaskCategory(req, res) {
    const { projectId, name, color } = req.body;
    const category = await prisma.taskCategory.create({
        data: {
            projectId,
            name,
            color,
            isSystem: false
        }
    });
    res.status(201).json({
        success: true,
        data: category
    });
}
/**
 * 添加任务协作者
 */
export async function addCollaborator(req, res) {
    const { id } = req.params;
    const { userId: collaboratorId } = req.body;
    const currentUserId = req.userId;
    // 检查任务
    const task = await prisma.task.findFirst({
        where: { id, deletedAt: null }
    });
    if (!task) {
        throw new ApiError(404, '任务不存在');
    }
    // 检查权限
    const member = await prisma.projectMember.findUnique({
        where: {
            projectId_userId: { projectId: task.projectId, userId: currentUserId }
        }
    });
    if (!member) {
        throw new ApiError(403, '无权操作');
    }
    // 检查是否已是协作者
    const existing = await prisma.taskCollaborator.findUnique({
        where: {
            taskId_userId: { taskId: id, userId: collaboratorId }
        }
    });
    if (existing) {
        throw new ApiError(400, '用户已是协作者');
    }
    await prisma.taskCollaborator.create({
        data: {
            taskId: id,
            userId: collaboratorId
        }
    });
    res.status(201).json({
        success: true,
        message: '协作者已添加'
    });
}
/**
 * 移除任务协作者
 */
export async function removeCollaborator(req, res) {
    const { id, userId: collaboratorId } = req.params;
    const currentUserId = req.userId;
    const task = await prisma.task.findFirst({
        where: { id, deletedAt: null }
    });
    if (!task) {
        throw new ApiError(404, '任务不存在');
    }
    const member = await prisma.projectMember.findUnique({
        where: {
            projectId_userId: { projectId: task.projectId, userId: currentUserId }
        }
    });
    if (!member) {
        throw new ApiError(403, '无权操作');
    }
    await prisma.taskCollaborator.delete({
        where: {
            taskId_userId: { taskId: id, userId: collaboratorId }
        }
    });
    res.json({
        success: true,
        message: '协作者已移除'
    });
}
/**
 * 添加任务评论
 */
export async function addComment(req, res) {
    const { id } = req.params;
    const userId = req.userId;
    const { content, mentions, replyToId, images } = req.body;
    const task = await prisma.task.findFirst({
        where: { id, deletedAt: null }
    });
    if (!task) {
        throw new ApiError(404, '任务不存在');
    }
    const comment = await prisma.comment.create({
        data: {
            taskId: id,
            userId: userId,
            content,
            mentions: mentions ? JSON.stringify(mentions) : null,
            replyToId,
            images: images ? JSON.stringify(images) : null
        },
        include: {
            user: {
                select: { id: true, nickname: true, avatar: true }
            }
        }
    });
    res.status(201).json({
        success: true,
        data: comment
    });
}
/**
 * 删除任务评论
 */
export async function deleteComment(req, res) {
    const { id, commentId } = req.params;
    const userId = req.userId;
    const comment = await prisma.comment.findFirst({
        where: { id: commentId, taskId: id }
    });
    if (!comment) {
        throw new ApiError(404, '评论不存在');
    }
    // 只有评论作者可以删除
    if (comment.userId !== userId) {
        throw new ApiError(403, '无权删除该评论');
    }
    await prisma.comment.update({
        where: { id: commentId },
        data: { deletedAt: new Date() }
    });
    res.json({
        success: true,
        message: '评论已删除'
    });
}
//# sourceMappingURL=taskController.js.map