/**
 * 中集智历 - 标签控制器
 */
import { Request, Response } from 'express';
export declare const TAG_COLORS: {
    name: string;
    value: string;
    bgClass: string;
    textClass: string;
}[];
/**
 * 获取所有标签
 * 从用户有权限的任务中提取所有唯一标签
 */
export declare function getTags(req: Request, res: Response): Promise<void>;
/**
 * 创建标签（实际上是验证标签名称并返回带颜色的标签对象）
 * 由于标签存储在任务的tags数组中，这里只返回标签对象供前端使用
 */
export declare function createTag(req: Request, res: Response): Promise<void>;
/**
 * 更新任务标签
 */
export declare function updateTaskTags(req: Request, res: Response): Promise<void>;
/**
 * 获取预定义颜色列表
 */
export declare function getTagColors(_req: Request, res: Response): void;
//# sourceMappingURL=tagController.d.ts.map