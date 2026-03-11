/**
 * 中集智历 - 部门权限中间件
 */
import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.js';
/**
 * 检查用户是否有项目访问权限
 * - 系统管理员：所有项目
 * - 部门管理员：本部门项目 + 被邀请的项目
 * - 普通成员：本部门项目 + 被邀请的项目
 */
export declare function checkProjectAccess(userId: string, projectId: string): Promise<boolean>;
/**
 * 检查用户是否为部门管理员（指定部门）
 */
export declare function isDepartmentAdmin(userId: string, departmentId: string): Promise<boolean>;
/**
 * 检查用户是否可以管理部门项目
 * - 系统管理员可以管理所有项目
 * - 部门管理员可以管理本部门项目
 */
export declare function canManageDepartmentProject(userId: string, projectId: string): Promise<boolean>;
/**
 * 检查用户是否属于指定部门
 */
export declare function isUserInDepartment(userId: string, departmentId: string): Promise<boolean>;
/**
 * 项目访问权限中间件
 */
export declare function requireProjectAccess(req: AuthRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/**
 * 部门管理员权限中间件（针对特定部门）
 */
export declare function requireDeptAdminForProject(req: AuthRequest, res: Response, next: NextFunction): Promise<void | Response<any, Record<string, any>>>;
/**
 * 获取用户可访问的项目ID列表
 */
export declare function getAccessibleProjectIds(userId: string): Promise<string[]>;
//# sourceMappingURL=departmentPermission.d.ts.map