/**
 * 中集智历 - 用户控制器
 */
import { Request, Response } from 'express';
/**
 * 获取用户列表（管理员）
 */
export declare function getUsers(_req: Request, res: Response): Promise<void>;
/**
 * 管理员创建用户
 */
export declare function createUser(req: Request, res: Response): Promise<void>;
/**
 * 获取用户详情
 */
export declare function getUserById(req: Request, res: Response): Promise<void>;
/**
 * 更新用户信息
 */
export declare function updateUser(req: Request, res: Response): Promise<void>;
/**
 * 删除用户（管理员）
 */
export declare function deleteUser(req: Request, res: Response): Promise<void>;
/**
 * 切换用户状态（启用/禁用）
 */
export declare function toggleUserStatus(req: Request, res: Response): Promise<void>;
/**
 * 搜索用户（用于跨部门邀请）
 * 只返回基本信息：id, nickname, department
 */
export declare function searchUsers(req: Request, res: Response): Promise<void>;
/**
 * 转让管理员权限
 */
export declare function transferAdmin(req: Request, res: Response): Promise<void>;
/**
 * 获取部门成员列表（部门管理员）
 */
export declare function getDepartmentMembers(req: Request, res: Response): Promise<void>;
/**
 * 转让部门管理员权限
 */
export declare function transferDepartmentAdmin(req: Request, res: Response): Promise<void>;
/**
 * 部门管理员移除部门成员
 */
export declare function removeDepartmentMember(req: Request, res: Response): Promise<void>;
/**
 * 部门管理员禁用/启用本部门成员
 */
export declare function toggleDepartmentMemberStatus(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=userController.d.ts.map