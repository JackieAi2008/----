/**
 * 中集智历 - 认证中间件
 */
import { Request, Response, NextFunction } from 'express';
export interface AuthRequest extends Request {
    userId?: string;
    userRole?: string;
    departmentId?: string;
}
/**
 * 验证JWT Token中间件
 */
export declare function auth(req: AuthRequest, res: Response, next: NextFunction): Response<any, Record<string, any>> | undefined;
/**
 * 可选认证中间件（不强制要求登录）
 */
export declare function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction): void;
/**
 * 管理员权限中间件
 */
export declare function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): Response<any, Record<string, any>> | undefined;
/**
 * 部门管理员权限中间件（系统管理员或部门管理员）
 */
export declare function requireDepartmentAdmin(req: AuthRequest, res: Response, next: NextFunction): Promise<void | Response<any, Record<string, any>>>;
/**
 * 检查用户是否为部门管理员（指定部门）
 */
export declare function isDepartmentAdmin(userId: string, departmentId: string): Promise<boolean>;
/**
 * 检查用户是否为系统管理员
 */
export declare function isSystemAdmin(userId: string): Promise<boolean>;
//# sourceMappingURL=auth.d.ts.map