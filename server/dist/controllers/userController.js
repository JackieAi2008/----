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
            createdAt: true
        },
        orderBy: { createdAt: 'desc' }
    });
    res.json({
        success: true,
        data: users
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
        where: { id: currentUserId }
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
            createdAt: true,
            updatedAt: true
        }
    });
    if (!user) {
        throw new ApiError(404, '用户不存在');
    }
    res.json({
        success: true,
        data: user
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
            createdAt: true,
            updatedAt: true
        }
    });
    res.json({
        success: true,
        data: user
    });
}
/**
 * 搜索用户
 */
export async function searchUsers(req, res) {
    const { keyword } = req.query;
    if (!keyword || typeof keyword !== 'string') {
        throw new ApiError(400, '请输入搜索关键词');
    }
    const users = await prisma.user.findMany({
        where: {
            OR: [
                { nickname: { contains: keyword } },
                { email: { contains: keyword } }
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
    res.json({
        success: true,
        data: users
    });
}
//# sourceMappingURL=userController.js.map