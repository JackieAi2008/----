/**
 * 中集智历 - 附件控制器
 */
import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.js';
/**
 * @desc    上传附件到任务
 * @route   POST /api/tasks/:taskId/attachments
 * @access  Private
 */
export declare const uploadAttachment: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * @desc    获取任务附件列表
 * @route   GET /api/tasks/:taskId/attachments
 * @access  Private
 */
export declare const getAttachments: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * @desc    下载附件
 * @route   GET /api/attachments/:id/download
 * @access  Private
 */
export declare const downloadAttachment: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * @desc    删除附件
 * @route   DELETE /api/attachments/:id
 * @access  Private
 */
export declare const deleteAttachment: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=attachmentController.d.ts.map