import prisma from '../config/database.js';
/**
 * 检查用户是否有项目访问权限
 * - 系统管理员：所有项目
 * - 部门管理员：本部门项目 + 被邀请的项目
 * - 普通成员：本部门项目 + 被邀请的项目
 */
export async function checkProjectAccess(userId, projectId) {
    // 获取用户信息
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { isAdmin: true, departmentId: true }
    });
    if (!user)
        return false;
    if (user.isAdmin)
        return true;
    // 获取项目信息
    const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { departmentId: true, visibility: true }
    });
    if (!project)
        return false;
    // 公开项目
    if (project.visibility === 'PUBLIC')
        return true;
    // 同部门项目
    if (user.departmentId && project.departmentId === user.departmentId)
        return true;
    // 检查是否是项目成员
    const member = await prisma.projectMember.findUnique({
        where: {
            projectId_userId: { projectId, userId }
        }
    });
    return !!member;
}
/**
 * 检查用户是否为部门管理员（指定部门）
 */
export async function isDepartmentAdmin(userId, departmentId) {
    const department = await prisma.department.findFirst({
        where: { id: departmentId, adminId: userId }
    });
    return !!department;
}
/**
 * 检查用户是否可以管理部门项目
 * - 系统管理员可以管理所有项目
 * - 部门管理员可以管理本部门项目
 */
export async function canManageDepartmentProject(userId, projectId) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { isAdmin: true }
    });
    if (user?.isAdmin)
        return true;
    const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { departmentId: true }
    });
    if (!project?.departmentId)
        return false;
    return isDepartmentAdmin(userId, project.departmentId);
}
/**
 * 检查用户是否属于指定部门
 */
export async function isUserInDepartment(userId, departmentId) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { departmentId: true }
    });
    return user?.departmentId === departmentId;
}
/**
 * 项目访问权限中间件
 */
export async function requireProjectAccess(req, res, next) {
    const projectId = req.params.id || req.params.projectId || req.body.projectId;
    const userId = req.userId;
    if (!userId) {
        return res.status(401).json({
            success: false,
            message: '未登录'
        });
    }
    const hasAccess = await checkProjectAccess(userId, projectId);
    if (!hasAccess) {
        return res.status(403).json({
            success: false,
            message: '无权访问该项目'
        });
    }
    next();
}
/**
 * 部门管理员权限中间件（针对特定部门）
 */
export async function requireDeptAdminForProject(req, res, next) {
    const projectId = req.params.id;
    const userId = req.userId;
    if (!userId) {
        return res.status(401).json({
            success: false,
            message: '未登录'
        });
    }
    // 系统管理员直接通过
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { isAdmin: true }
    });
    if (user?.isAdmin) {
        return next();
    }
    // 检查是否是项目负责人
    const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { ownerId: true, departmentId: true }
    });
    if (!project) {
        return res.status(404).json({
            success: false,
            message: '项目不存在'
        });
    }
    if (project.ownerId === userId) {
        return next();
    }
    // 检查是否是部门管理员
    if (project.departmentId) {
        const isDeptAdmin = await isDepartmentAdmin(userId, project.departmentId);
        if (isDeptAdmin) {
            return next();
        }
    }
    return res.status(403).json({
        success: false,
        message: '需要项目负责人或部门管理员权限'
    });
}
/**
 * 获取用户可访问的项目ID列表
 */
export async function getAccessibleProjectIds(userId) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { isAdmin: true, departmentId: true }
    });
    if (!user)
        return [];
    if (user.isAdmin) {
        // 系统管理员可以访问所有项目
        const projects = await prisma.project.findMany({
            where: { deletedAt: null },
            select: { id: true }
        });
        return projects.map(p => p.id);
    }
    // 普通用户：本部门项目 + 被邀请的项目
    const projects = await prisma.project.findMany({
        where: {
            deletedAt: null,
            OR: [
                { departmentId: user.departmentId },
                { members: { some: { userId } } }
            ]
        },
        select: { id: true }
    });
    return projects.map(p => p.id);
}
//# sourceMappingURL=departmentPermission.js.map