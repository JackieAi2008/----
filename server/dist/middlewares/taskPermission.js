import prisma from '../config/database.js';
import { ApiError } from './errorHandler.js';
// 任务操作类型
export var TaskAction;
(function (TaskAction) {
    TaskAction["VIEW"] = "view";
    TaskAction["EDIT"] = "edit";
    TaskAction["DELETE"] = "delete";
    TaskAction["UPDATE_STATUS"] = "update_status";
    TaskAction["CHANGE_ASSIGNEE"] = "change_assignee";
    TaskAction["CHANGE_DUE_DATE"] = "change_due_date";
    TaskAction["ADD_COLLABORATOR"] = "add_collaborator";
    TaskAction["REMOVE_COLLABORATOR"] = "remove_collaborator";
    TaskAction["ADD_COMMENT"] = "add_comment";
})(TaskAction || (TaskAction = {}));
/**
 * 检查用户对任务的权限
 */
async function checkTaskPermission(userId, taskId) {
    // 获取任务信息
    const task = await prisma.task.findFirst({
        where: { id: taskId, deletedAt: null },
        select: {
            id: true,
            projectId: true,
            creatorId: true,
            assigneeId: true
        }
    });
    if (!task) {
        return {
            isProjectOwner: false,
            isCreator: false,
            isAssignee: false,
            isCollaborator: false,
            isProjectMember: false,
            task: null
        };
    }
    // 检查是否是项目成员并获取项目信息
    const projectMember = await prisma.projectMember.findUnique({
        where: {
            projectId_userId: { projectId: task.projectId, userId }
        },
        include: {
            project: {
                select: { ownerId: true }
            }
        }
    });
    const isProjectOwner = projectMember?.project.ownerId === userId;
    const isCreator = task.creatorId === userId;
    const isAssignee = task.assigneeId === userId;
    // 检查是否是协作者
    const collaborator = await prisma.taskCollaborator.findUnique({
        where: {
            taskId_userId: { taskId, userId }
        }
    });
    const isCollaborator = !!collaborator;
    const isProjectMember = !!projectMember;
    return {
        isProjectOwner,
        isCreator,
        isAssignee,
        isCollaborator,
        isProjectMember,
        task
    };
}
/**
 * 获取用户对任务的权限信息
 */
export async function getTaskPermissions(userId, taskId) {
    const { isProjectOwner, isCreator, isAssignee, isCollaborator, isProjectMember, task } = await checkTaskPermission(userId, taskId);
    // 如果任务不存在或用户不是项目成员，没有任何权限
    if (!task || !isProjectMember) {
        return {
            canEdit: false,
            canDelete: false,
            canChangeStatus: false,
            canChangeAssignee: false,
            canChangeDueDate: false,
            canAddCollaborator: false,
            canRemoveCollaborator: false,
            canComment: false
        };
    }
    // 编辑和删除：项目负责人或任务创建者
    const canEdit = isProjectOwner || isCreator;
    const canDelete = isProjectOwner || isCreator;
    // 修改负责人和截止时间：项目负责人或任务创建者
    const canChangeAssignee = isProjectOwner || isCreator;
    const canChangeDueDate = isProjectOwner || isCreator;
    // 更新状态：项目负责人、任务创建者、任务负责人或协作者
    const canChangeStatus = isProjectOwner || isCreator || isAssignee || isCollaborator;
    // 添加/移除协作者：项目负责人或任务创建者
    const canAddCollaborator = isProjectOwner || isCreator;
    const canRemoveCollaborator = isProjectOwner || isCreator;
    // 评论：所有项目成员
    const canComment = isProjectMember;
    return {
        canEdit,
        canDelete,
        canChangeStatus,
        canChangeAssignee,
        canChangeDueDate,
        canAddCollaborator,
        canRemoveCollaborator,
        canComment
    };
}
/**
 * 任务权限检查中间件工厂
 */
export function requireTaskPermission(action) {
    return async (req, _res, next) => {
        const userId = req.userId;
        const taskId = req.params.id || req.params.taskId;
        if (!userId || !taskId) {
            throw new ApiError(401, '未授权');
        }
        const { isProjectOwner, isCreator, isAssignee, isCollaborator, isProjectMember, task } = await checkTaskPermission(userId, taskId);
        if (!task) {
            throw new ApiError(404, '任务不存在');
        }
        if (!isProjectMember) {
            throw new ApiError(403, '无权访问该任务');
        }
        let hasPermission = false;
        switch (action) {
            case TaskAction.VIEW:
                hasPermission = isProjectMember;
                break;
            case TaskAction.EDIT:
            case TaskAction.DELETE:
            case TaskAction.CHANGE_ASSIGNEE:
            case TaskAction.CHANGE_DUE_DATE:
            case TaskAction.ADD_COLLABORATOR:
            case TaskAction.REMOVE_COLLABORATOR:
                // 项目负责人或任务创建者
                hasPermission = isProjectOwner || isCreator;
                break;
            case TaskAction.UPDATE_STATUS:
                // 项目负责人、任务创建者、任务负责人或协作者
                hasPermission = isProjectOwner || isCreator || isAssignee || isCollaborator;
                break;
            case TaskAction.ADD_COMMENT:
                // 所有项目成员
                hasPermission = isProjectMember;
                break;
            default:
                hasPermission = false;
        }
        if (!hasPermission) {
            throw new ApiError(403, '无权执行该操作');
        }
        // 将权限信息附加到请求对象
        req.taskPermission = await getTaskPermissions(userId, taskId);
        next();
    };
}
/**
 * 为任务响应添加权限信息
 */
export async function addPermissionsToTask(userId, task) {
    const permissions = await getTaskPermissions(userId, task.id);
    return {
        ...task,
        permissions
    };
}
//# sourceMappingURL=taskPermission.js.map