/**
 * 中集智历 - 附件路由
 */
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import * as attachmentController from '../controllers/attachmentController.js';
import { auth } from '../middlewares/auth.js';
const router = Router();
// 附件存储目录
const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'attachments');
// 确保上传目录存在
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}
// 配置multer存储
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (_req, file, cb) => {
        // 生成唯一文件名：时间戳-随机数-原始文件名
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        const ext = path.extname(file.originalname);
        cb(null, `${uniqueSuffix}${ext}`);
    }
});
// 文件过滤器
const fileFilter = (_req, file, cb) => {
    // 允许的文件类型
    const allowedMimeTypes = [
        // 图片
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/svg+xml',
        // 文档
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        // 文本
        'text/plain',
        'text/csv',
        'text/markdown',
        // 压缩文件
        'application/zip',
        'application/x-rar-compressed',
        'application/x-7z-compressed',
        // 其他
        'application/json',
        'application/xml'
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new Error(`不支持的文件类型: ${file.mimetype}`));
    }
};
// 配置multer
const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB
    }
});
/**
 * @route   POST /api/tasks/:taskId/attachments
 * @desc    上传附件到任务
 * @access  Private
 */
router.post('/tasks/:taskId/attachments', auth, upload.single('file'), attachmentController.uploadAttachment);
/**
 * @route   GET /api/tasks/:taskId/attachments
 * @desc    获取任务附件列表
 * @access  Private
 */
router.get('/tasks/:taskId/attachments', auth, attachmentController.getAttachments);
/**
 * @route   GET /api/attachments/:id/download
 * @desc    下载附件
 * @access  Private
 */
router.get('/attachments/:id/download', auth, attachmentController.downloadAttachment);
/**
 * @route   DELETE /api/attachments/:id
 * @desc    删除附件
 * @access  Private
 */
router.delete('/attachments/:id', auth, attachmentController.deleteAttachment);
export default router;
//# sourceMappingURL=attachments.js.map