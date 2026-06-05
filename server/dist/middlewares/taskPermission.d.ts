/**
 * 中集智历 - 任务权限中间件
 *
 * 权限规则：
 * - 编辑任务：项目负责人、任务创建者或任务负责人
 * - 删除任务：项目负责人、任务创建者或任务负责人
 * - 修改负责人：项目负责人、任务创建者或任务负责人
 * - 修改截止时间：项目负责人、任务创建者或任务负责人
 * - 更新状态：项目负责人、任务创建者、任务负责人或协作者
 */
import { Request, Response, NextFunction } from 'express';
export declare enum TaskAction {
    VIEW = "view",
    EDIT = "edit",
    DELETE = "delete",
    UPDATE_STATUS = "update_status",
    CHANGE_ASSIGNEE = "change_assignee",
    CHANGE_DUE_DATE = "change_due_date",
    ADD_COLLABORATOR = "add_collaborator",
    REMOVE_COLLABORATOR = "remove_collaborator",
    ADD_COMMENT = "add_comment"
}
export interface TaskPermissionRequest extends Request {
    userId?: string;
    taskPermission?: {
        canEdit: boolean;
        canDelete: boolean;
        canChangeStatus: boolean;
        canChangeAssignee: boolean;
        canChangeDueDate: boolean;
        canAddCollaborator: boolean;
        canRemoveCollaborator: boolean;
        canComment: boolean;
    };
}
/**
 * 获取用户对任务的权限信息
 */
export declare function getTaskPermissions(userId: string, taskId: string): Promise<{
    canEdit: boolean;
    canDelete: boolean;
    canChangeStatus: boolean;
    canChangeAssignee: boolean;
    canChangeDueDate: boolean;
    canAddCollaborator: boolean;
    canRemoveCollaborator: boolean;
    canComment: boolean;
}>;
/**
 * 任务权限检查中间件工厂
 */
export declare function requireTaskPermission(action: TaskAction): (req: TaskPermissionRequest, _res: Response, next: NextFunction) => Promise<void>;
/**
 * 为任务响应添加权限信息
 */
export declare function addPermissionsToTask(userId: string, task: Record<string, unknown>): Promise<Record<string, unknown>>;
//# sourceMappingURL=taskPermission.d.ts.map