import prisma from '../config/database.js';
import { ApiError } from '../middlewares/errorHandler.js';
/**
 * 获取用户列表（管理员）
 */
export async function getUsers(_req, res) {
    const users = await prisma.user.findMany({
        select: {
            id: true,
            email: true,
            nickname: true,
            avatar: true,
            bio: true,
            isAdmin: true,
            isBanned: true,
            departmentId: true,
            department: {
                select: { id: true, name: true }
            },
            createdAt: true
        },
        orderBy: { createdAt: 'desc' }
    });
    // 添加 isDepartmentAdmin 字段
    const departmentAdmins = await prisma.department.findMany({
        select: { adminId: true }
    });
    const adminIds = new Set(departmentAdmins.map(d => d.adminId));
    res.json({
        success: true,
        data: users.map(user => ({
            ...user,
            isDepartmentAdmin: adminIds.has(user.id)
        }))
    });
}
/**
 * 获取用户详情
 */
export async function getUserById(req, res) {
    const { id } = req.params;
    const currentUserId = req.userId;
    // 只能查看自己的信息，或者是管理员
    const currentUser = await prisma.user.findUnique({
        where: { id: currentUserId },
        select: { isAdmin: true }
    });
    if (id !== currentUserId && !currentUser?.isAdmin) {
        throw new ApiError(403, '无权查看其他用户信息');
    }
    const user = await prisma.user.findUnique({
        where: { id },
        select: {
            id: true,
            email: true,
            nickname: true,
            avatar: true,
            bio: true,
            isAdmin: true,
            isBanned: true,
            departmentId: true,
            department: {
                select: { id: true, name: true }
            },
            createdAt: true,
            updatedAt: true
        }
    });
    if (!user) {
        throw new ApiError(404, '用户不存在');
    }
    // 检查是否为部门管理员
    const managedDepartment = await prisma.department.findUnique({
        where: { adminId: id },
        select: { id: true, name: true }
    });
    res.json({
        success: true,
        data: {
            ...user,
            isDepartmentAdmin: !!managedDepartment,
            managedDepartment
        }
    });
}
/**
 * 更新用户信息
 */
export async function updateUser(req, res) {
    const { id } = req.params;
    const currentUserId = req.userId;
    const { nickname, bio, avatar } = req.body;
    // 只能更新自己的信息
    if (id !== currentUserId) {
        throw new ApiError(403, '无权修改其他用户信息');
    }
    const user = await prisma.user.update({
        where: { id },
        data: { nickname, bio, avatar },
        select: {
            id: true,
            email: true,
            nickname: true,
            avatar: true,
            bio: true,
            isAdmin: true,
            isBanned: true,
            departmentId: true,
            department: {
                select: { id: true, name: true }
            },
            createdAt: true,
            updatedAt: true
        }
    });
    // 检查是否为部门管理员
    const managedDepartment = await prisma.department.findUnique({
        where: { adminId: id },
        select: { id: true, name: true }
    });
    res.json({
        success: true,
        data: {
            ...user,
            isDepartmentAdmin: !!managedDepartment,
            managedDepartment
        }
    });
}
/**
 * 搜索用户（用于跨部门邀请）
 * 只返回基本信息：id, nickname, department
 */
export async function searchUsers(req, res) {
    const userId = req.userId;
    const { keyword, projectId } = req.query;
    if (!keyword || typeof keyword !== 'string' || keyword.length < 2) {
        throw new ApiError(400, '搜索关键词至少2个字符');
    }
    // 获取当前用户信息
    const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { isAdmin: true, departmentId: true }
    });
    // 构建搜索条件
    const whereClause = {
        isBanned: false,
        OR: [
            { nickname: { contains: keyword } },
            { email: { contains: keyword } }
        ]
    };
    // 如果不是系统管理员，排除自己部门的人（他们可以直接看到）
    if (!currentUser?.isAdmin && currentUser?.departmentId) {
        whereClause.departmentId = { not: currentUser.departmentId };
    }
    // 如果指定了项目ID，排除已经是项目成员的人
    if (projectId && typeof projectId === 'string') {
        whereClause.NOT = {
            projectMembers: {
                some: { projectId }
            }
        };
    }
    const users = await prisma.user.findMany({
        where: whereClause,
        select: {
            id: true,
            nickname: true,
            email: true,
            avatar: true,
            department: {
                select: { id: true, name: true }
            }
        },
        take: 20
    });
    res.json({
        success: true,
        data: users
    });
}
//# sourceMappingURL=userController.js.map