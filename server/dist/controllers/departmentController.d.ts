/**
 * 中集智历 - 部门控制器
 */
import { Request, Response } from 'express';
/**
 * 获取所有部门列表（系统管理员）
 */
export declare function getDepartments(_req: Request, res: Response): Promise<void>;
/**
 * 获取部门详情
 */
export declare function getDepartmentById(req: Request, res: Response): Promise<void>;
/**
 * 创建部门（系统管理员）
 */
export declare function createDepartment(req: Request, res: Response): Promise<void>;
/**
 * 更新部门信息（系统管理员）
 */
export declare function updateDepartment(req: Request, res: Response): Promise<void>;
/**
 * 删除部门（系统管理员）
 */
export declare function deleteDepartment(req: Request, res: Response): Promise<void>;
/**
 * 获取我管理的部门（部门管理员）
 */
export declare function getMyDepartment(req: Request, res: Response): Promise<void>;
/**
 * 添加部门成员（部门管理员）
 */
export declare function addMember(req: Request, res: Response): Promise<void>;
/**
 * 移除部门成员（部门管理员）
 */
export declare function removeMember(req: Request, res: Response): Promise<void>;
/**
 * 更换部门管理员（系统管理员）
 */
export declare function changeAdmin(req: Request, res: Response): Promise<void>;
/**
 * 获取简单部门列表（用于下拉选择）
 */
export declare function getDepartmentOptions(_req: Request, res: Response): Promise<void>;
/**
 * 获取部门仪表盘数据
 */
export declare function getDepartmentDashboard(req: Request, res: Response): Promise<void>;
/**
 * 获取部门成员详情（含日历）
 */
export declare function getMemberDetail(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=departmentController.d.ts.map