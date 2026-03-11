/**
 * 中集智历 - 任务控制器
 */
import { Request, Response } from 'express';
/**
 * 获取任务列表
 */
export declare function getTasks(req: Request, res: Response): Promise<void>;
/**
 * 获取任务详情
 */
export declare function getTaskById(req: Request, res: Response): Promise<void>;
/**
 * 创建任务
 */
export declare function createTask(req: Request, res: Response): Promise<void>;
/**
 * 更新任务
 */
export declare function updateTask(req: Request, res: Response): Promise<void>;
/**
 * 更新任务状态（负责人、协作者也可以更新）
 */
export declare function updateTaskStatus(req: Request, res: Response): Promise<void>;
/**
 * 删除任务（软删除）
 */
export declare function deleteTask(req: Request, res: Response): Promise<void>;
/**
 * 获取任务类别列表
 */
export declare function getTaskCategories(req: Request, res: Response): Promise<void>;
/**
 * 创建任务类别
 */
export declare function createTaskCategory(req: Request, res: Response): Promise<void>;
/**
 * 添加任务协作者
 */
export declare function addCollaborator(req: Request, res: Response): Promise<void>;
/**
 * 移除任务协作者
 */
export declare function removeCollaborator(req: Request, res: Response): Promise<void>;
/**
 * 添加任务评论
 */
export declare function addComment(req: Request, res: Response): Promise<void>;
/**
 * 删除任务评论
 */
export declare function deleteComment(req: Request, res: Response): Promise<void>;
/**
 * 归档已完成超过30天的任务
 */
export declare function archiveCompletedTasks(req: Request, res: Response): Promise<void>;
/**
 * 获取已归档任务列表
 */
export declare function getArchivedTasks(req: Request, res: Response): Promise<void>;
/**
 * 恢复归档任务
 */
export declare function unarchiveTask(req: Request, res: Response): Promise<void>;
/**
 * 批量更新任务
 */
export declare function batchUpdateTasks(req: Request, res: Response): Promise<void>;
/**
 * 批量删除任务
 */
export declare function batchDeleteTasks(req: Request, res: Response): Promise<void>;
/**
 * 批量归档任务
 */
export declare function batchArchiveTasks(req: Request, res: Response): Promise<void>;
/**
 * 获取所有标签
 */
export declare function getAllTags(req: Request, res: Response): Promise<void>;
/**
 * 更新任务标签
 */
export declare function updateTaskTags(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=taskController.d.ts.map