/**
 * 中集智历 - 项目控制器
 */
import { Request, Response } from 'express';
/**
 * 获取当前用户的项目列表
 */
export declare function getProjects(req: Request, res: Response): Promise<void>;
/**
 * 获取公开项目列表
 */
export declare function getPublicProjects(_req: Request, res: Response): Promise<void>;
/**
 * 获取项目详情
 */
export declare function getProjectById(req: Request, res: Response): Promise<void>;
/**
 * 创建项目
 */
export declare function createProject(req: Request, res: Response): Promise<void>;
/**
 * 更新项目
 */
export declare function updateProject(req: Request, res: Response): Promise<void>;
/**
 * 删除项目（软删除）
 */
export declare function deleteProject(req: Request, res: Response): Promise<void>;
/**
 * 获取项目成员
 */
export declare function getProjectMembers(req: Request, res: Response): Promise<void>;
/**
 * 添加项目成员
 */
export declare function addMember(req: Request, res: Response): Promise<void>;
/**
 * 移除项目成员
 */
export declare function removeMember(req: Request, res: Response): Promise<void>;
/**
 * 邀请用户加入项目
 */
export declare function inviteUser(req: Request, res: Response): Promise<void>;
/**
 * 接受项目邀请
 */
export declare function acceptInvite(req: Request, res: Response): Promise<void>;
/**
 * 拒绝项目邀请
 */
export declare function rejectInvite(req: Request, res: Response): Promise<void>;
/**
 * 获取已删除的项目列表
 */
export declare function getDeletedProjects(req: Request, res: Response): Promise<void>;
/**
 * 恢复已删除的项目
 */
export declare function restoreProject(req: Request, res: Response): Promise<void>;
/**
 * 永久删除项目
 */
export declare function permanentDeleteProject(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=projectController.d.ts.map