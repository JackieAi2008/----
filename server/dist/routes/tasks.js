/**
 * 中集智历 - 任务路由
 */
import { Router } from 'express';
import { body } from 'express-validator';
import * as taskController from '../controllers/taskController.js';
import { auth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validator.js';
import { requireTaskPermission, TaskAction } from '../middlewares/taskPermission.js';
const router = Router();
// 创建任务验证规则
const createTaskValidation = [
    body('projectId').notEmpty().withMessage('请选择项目'),
    body('title').notEmpty().withMessage('请输入任务标题'),
    body('dueDate').isISO8601().withMessage('请输入有效的截止日期'),
    body('assigneeId').notEmpty().withMessage('请选择负责人'),
    validate
];
// 更新任务验证规则
const updateTaskValidation = [
    body('title').optional().notEmpty().withMessage('任务标题不能为空'),
    body('dueDate').optional().isISO8601().withMessage('请输入有效的截止日期'),
    body('status').optional().isIn(['TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED']).withMessage('无效的任务状态'),
    body('priority').optional().isIn(['HIGH', 'MEDIUM', 'LOW']).withMessage('无效的优先级'),
    validate
];
// 更新任务状态验证规则
const updateStatusValidation = [
    body('status').isIn(['TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED']).withMessage('无效的任务状态'),
    validate
];
/**
 * @route   GET /api/tasks
 * @desc    获取任务列表
 * @access  Private
 */
router.get('/', auth, taskController.getTasks);
/**
 * @route   GET /api/tasks/categories
 * @desc    获取任务类别列表
 * @access  Private
 */
router.get('/categories', auth, taskController.getTaskCategories);
/**
 * @route   POST /api/tasks/categories
 * @desc    创建任务类别
 * @access  Private
 */
router.post('/categories', auth, taskController.createTaskCategory);
/**
 * @route   GET /api/tasks/:id
 * @desc    获取任务详情
 * @access  Private
 */
router.get('/:id', auth, taskController.getTaskById);
/**
 * @route   POST /api/tasks
 * @desc    创建任务
 * @access  Private
 */
router.post('/', auth, createTaskValidation, taskController.createTask);
/**
 * @route   PUT /api/tasks/:id
 * @desc    更新任务
 * @access  Private (需要编辑权限)
 */
router.put('/:id', auth, requireTaskPermission(TaskAction.EDIT), updateTaskValidation, taskController.updateTask);
/**
 * @route   PATCH /api/tasks/:id/status
 * @desc    更新任务状态（负责人、协作者也可以更新）
 * @access  Private (需要状态更新权限)
 */
router.patch('/:id/status', auth, requireTaskPermission(TaskAction.UPDATE_STATUS), updateStatusValidation, taskController.updateTaskStatus);
/**
 * @route   DELETE /api/tasks/:id
 * @desc    删除任务（软删除）
 * @access  Private (需要删除权限)
 */
router.delete('/:id', auth, requireTaskPermission(TaskAction.DELETE), taskController.deleteTask);
/**
 * @route   POST /api/tasks/:id/collaborators
 * @desc    添加任务协作者
 * @access  Private
 */
router.post('/:id/collaborators', auth, taskController.addCollaborator);
/**
 * @route   DELETE /api/tasks/:id/collaborators/:userId
 * @desc    移除任务协作者
 * @access  Private
 */
router.delete('/:id/collaborators/:userId', auth, taskController.removeCollaborator);
/**
 * @route   POST /api/tasks/:id/comments
 * @desc    添加任务评论
 * @access  Private
 */
router.post('/:id/comments', auth, taskController.addComment);
/**
 * @route   DELETE /api/tasks/:id/comments/:commentId
 * @desc    删除任务评论
 * @access  Private
 */
router.delete('/:id/comments/:commentId', auth, taskController.deleteComment);
export default router;
//# sourceMappingURL=tasks.js.map