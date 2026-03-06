/**
 * 中集智历 - 全局搜索控制器
 */
import { Request, Response } from 'express';
/**
 * 全局搜索
 * GET /api/search?keyword=xxx&types=task,project,user
 */
export declare function globalSearch(req: Request, res: Response): Promise<void>;
/**
 * 搜索任务（快速搜索）
 * GET /api/search/tasks?keyword=xxx
 */
export declare function searchTasks(req: Request, res: Response): Promise<void>;
/**
 * 搜索项目（快速搜索）
 * GET /api/search/projects?keyword=xxx
 */
export declare function searchProjects(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=searchController.d.ts.map