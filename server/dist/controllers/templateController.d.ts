/**
 * 中集智历 - 任务模板控制器
 */
import { Request, Response } from 'express';
/**
 * 获取任务模板列表
 */
export declare function getTemplates(req: Request, res: Response): Promise<void>;
/**
 * 获取任务模板详情
 */
export declare function getTemplateById(req: Request, res: Response): Promise<void>;
/**
 * 创建任务模板
 */
export declare function createTemplate(req: Request, res: Response): Promise<void>;
/**
 * 从任务创建模板
 */
export declare function createTemplateFromTask(req: Request, res: Response): Promise<void>;
/**
 * 更新任务模板
 */
export declare function updateTemplate(req: Request, res: Response): Promise<void>;
/**
 * 删除任务模板
 */
export declare function deleteTemplate(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=templateController.d.ts.map