import prisma from '../config/database.js';
import { ApiError } from '../middlewares/errorHandler.js';
// 预定义标签颜色
export const TAG_COLORS = [
    { name: '红色', value: '#EF4444', bgClass: 'bg-red-100', textClass: 'text-red-700' },
    { name: '橙色', value: '#F97316', bgClass: 'bg-orange-100', textClass: 'text-orange-700' },
    { name: '黄色', value: '#EAB308', bgClass: 'bg-yellow-100', textClass: 'text-yellow-700' },
    { name: '绿色', value: '#22C55E', bgClass: 'bg-green-100', textClass: 'text-green-700' },
    { name: '青色', value: '#06B6D4', bgClass: 'bg-cyan-100', textClass: 'text-cyan-700' },
    { name: '蓝色', value: '#3B82F6', bgClass: 'bg-blue-100', textClass: 'text-blue-700' },
    { name: '紫色', value: '#8B5CF6', bgClass: 'bg-purple-100', textClass: 'text-purple-700' },
    { name: '粉色', value: '#EC4899', bgClass: 'bg-pink-100', textClass: 'text-pink-700' },
];
/**
 * 获取所有标签
 * 从用户有权限的任务中提取所有唯一标签
 */
export async function getTags(req, res) {
    const userId = req.userId;
    const { projectId } = req.query;
    try {
        // 构建查询条件
        const where = {
            deletedAt: null
        };
        if (projectId) {
            where.projectId = projectId;
        }
        else {
            // 如果没有指定项目，只返回用户有权限的任务的标签
            where.OR = [
                { assigneeId: userId },
                { collaborators: { some: { userId } } },
                { project: { members: { some: { userId } } } }
            ];
        }
        // 获取所有任务的标签
        const tasks = await prisma.task.findMany({
            where,
            select: { tags: true }
        });
        // 提取唯一标签
        const tagSet = new Set();
        tasks.forEach(task => {
            if (task.tags && Array.isArray(task.tags)) {
                task.tags.forEach(tag => tagSet.add(tag));
            }
        });
        // 为每个标签分配颜色（基于标签名哈希）
        const tags = Array.from(tagSet).map(name => ({
            name,
            color: getTagColor(name)
        }));
        res.json({
            success: true,
            data: tags
        });
    }
    catch (error) {
        console.error('获取标签失败:', error);
        throw new ApiError(500, '获取标签失败');
    }
}
/**
 * 创建标签（实际上是验证标签名称并返回带颜色的标签对象）
 * 由于标签存储在任务的tags数组中，这里只返回标签对象供前端使用
 */
export async function createTag(req, res) {
    const { name } = req.body;
    if (!name || typeof name !== 'string') {
        throw new ApiError(400, '标签名称不能为空');
    }
    // 验证标签名称（防止XSS）
    const trimmedName = name.trim();
    if (trimmedName.length === 0 || trimmedName.length > 20) {
        throw new ApiError(400, '标签名称长度应在1-20个字符之间');
    }
    const tag = {
        name: trimmedName,
        color: getTagColor(trimmedName)
    };
    res.status(201).json({
        success: true,
        data: tag
    });
}
/**
 * 更新任务标签
 */
export async function updateTaskTags(req, res) {
    const { id } = req.params;
    const userId = req.userId;
    const { tags } = req.body;
    // 验证标签
    if (!Array.isArray(tags)) {
        throw new ApiError(400, '标签必须是数组');
    }
    // 验证每个标签
    const validatedTags = tags.map(tag => {
        if (typeof tag !== 'string') {
            throw new ApiError(400, '标签必须是字符串');
        }
        return tag.trim();
    }).filter(tag => tag.length > 0 && tag.length <= 20);
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
    // 更新任务标签
    const updatedTask = await prisma.task.update({
        where: { id },
        data: { tags: JSON.stringify(validatedTags) },
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
 * 根据标签名获取颜色
 * 使用标签名的字符码总和来选择颜色，确保同一标签名总是获得相同颜色
 */
function getTagColor(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = hash + name.charCodeAt(i);
    }
    const index = hash % TAG_COLORS.length;
    return TAG_COLORS[index];
}
/**
 * 获取预定义颜色列表
 */
export function getTagColors(_req, res) {
    res.json({
        success: true,
        data: TAG_COLORS
    });
}
//# sourceMappingURL=tagController.js.map