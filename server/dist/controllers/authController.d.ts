/**
 * 中集智历 - 认证控制器
 */
import { Request, Response } from 'express';
/**
 * 用户登录
 */
export declare function login(req: Request, res: Response): Promise<void>;
/**
 * 用户注册
 */
export declare function register(req: Request, res: Response): Promise<void>;
/**
 * 获取当前用户信息
 */
export declare function getCurrentUser(req: Request, res: Response): Promise<void>;
/**
 * 修改密码
 */
export declare function changePassword(req: Request, res: Response): Promise<void>;
/**
 * 重置密码
 */
export declare function resetPassword(req: Request, res: Response): Promise<void>;
/**
 * 验证安全问题
 */
export declare function verifySecurityQuestion(req: Request, res: Response): Promise<void>;
/**
 * 获取用户的安全问题
 */
export declare function getSecurityQuestion(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=authController.d.ts.map