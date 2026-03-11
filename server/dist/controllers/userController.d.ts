/**
 * 中集智历 - 用户控制器
 */
import { Request, Response } from 'express';
/**
 * 获取用户列表（管理员）
 */
export declare function getUsers(_req: Request, res: Response): Promise<void>;
/**
 * 获取用户详情
 */
export declare function getUserById(req: Request, res: Response): Promise<void>;
/**
 * 更新用户信息
 */
export declare function updateUser(req: Request, res: Response): Promise<void>;
/**
 * 搜索用户（用于跨部门邀请）
 * 只返回基本信息：id, nickname, department
 */
export declare function searchUsers(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=userController.d.ts.map