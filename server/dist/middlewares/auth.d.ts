/**
 * 中集智历 - 认证中间件
 */
import { Request, Response, NextFunction } from 'express';
export interface AuthRequest extends Request {
    userId?: string;
    userRole?: string;
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
//# sourceMappingURL=auth.d.ts.map