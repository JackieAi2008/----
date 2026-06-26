/**
 * 中集智历 - 任务路由
 */
import { Router } from 'express'
import { body } from 'express-validator'
import multer from 'multer'
import * as taskController from '../controllers/taskController.js'
import * as importController from '../controllers/importController.js'
import { auth, requireAdmin } from '../middlewares/auth.js'
import { validate } from '../middlewares/validator.js'
import { requireTaskPermission, TaskAction } from '../middlewares/taskPermission.js'

const router = Router()

// xlsx 上传 (内存存储, 10MB 上限)
const importUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || /\.xlsx$/i.test(file.originalname)) {
      cb(null, true)
    } else {
      // 拒绝 → cb(null, false) 让 controller 判空后返回 400 (避免 500)
      cb(null, false)
    }
  }
})

// 创建任务验证规则
const createTaskValidation = [
  body('projectId').notEmpty().withMessage('请选择项目'),
  body('title').notEmpty().withMessage('请输入任务标题'),
  body('dueDate').isISO8601().withMessage('请输入有效的截止日期'),
  body('assigneeId').notEmpty().withMessage('请选择负责人'),
  validate
]

// 更新任务验证规则
const updateTaskValidation = [
  body('title').optional().notEmpty().withMessage('任务标题不能为空'),
  body('dueDate').optional().isISO8601().withMessage('请输入有效的截止日期'),
  body('status').optional().isIn(['TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED']).withMessage('无效的任务状态'),
  body('priority').optional().isIn(['IMPORTANT_URGENT', 'IMPORTANT_NOT_URGENT', 'URGENT_NOT_IMPORTANT', 'NOT_IMPORTANT_NOT_URGENT']).withMessage('无效的优先级'),
  validate
]

// 更新任务状态验证规则
const updateStatusValidation = [
  body('status').isIn(['TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED']).withMessage('无效的任务状态'),
  body('deliverable').optional().isString(),
  body('completionNote').optional().isString(),
  validate
]

// 批量更新任务验证规则
const batchUpdateValidation = [
  body('taskIds').isArray({ min: 1 }).withMessage('请选择要更新的任务'),
  body('status').optional().isIn(['TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED']).withMessage('无效的任务状态'),
  body('priority').optional().isIn(['IMPORTANT_URGENT', 'IMPORTANT_NOT_URGENT', 'URGENT_NOT_IMPORTANT', 'NOT_IMPORTANT_NOT_URGENT']).withMessage('无效的优先级'),
  validate
]

// 批量删除任务验证规则
const batchDeleteValidation = [
  body('taskIds').isArray({ min: 1 }).withMessage('请选择要删除的任务'),
  validate
]

/**
 * @route   GET /api/tasks
 * @desc    获取任务列表
 * @access  Private
 */
router.get('/', auth, taskController.getTasks)

/**
 * @route   GET /api/tasks/categories
 * @desc    获取任务类别列表
 * @access  Private
 */
router.get('/categories', auth, taskController.getTaskCategories)

/**
 * @route   GET /api/tasks/deliverable-options
 * @desc    获取交付成果选项列表
 * @access  Private
 */
router.get('/deliverable-options', auth, taskController.getDeliverableOptions)

/**
 * @route   POST /api/tasks/deliverable-options
 * @desc    新增交付成果选项
 * @access  Private (Admin)
 */
router.post('/deliverable-options', auth, requireAdmin, taskController.createDeliverableOption)

/**
 * @route   DELETE /api/tasks/deliverable-options/:id
 * @desc    删除交付成果选项
 * @access  Private (Admin)
 */
router.delete('/deliverable-options/:id', auth, requireAdmin, taskController.deleteDeliverableOption)

/**
 * @route   GET /api/tasks/tags
 * @desc    获取所有标签
 * @access  Private
 */
router.get('/tags', auth, taskController.getAllTags)

/**
 * @route   GET /api/tasks/archived
 * @desc    获取已归档任务列表
 * @access  Private
 */
router.get('/archived', auth, taskController.getArchivedTasks)

/**
 * @route   PUT /api/tasks/batch
 * @desc    批量更新任务
 * @access  Private
 */
router.put('/batch', auth, batchUpdateValidation, taskController.batchUpdateTasks)

/**
 * @route   DELETE /api/tasks/batch
 * @desc    批量删除任务
 * @access  Private
 */
router.delete('/batch', auth, batchDeleteValidation, taskController.batchDeleteTasks)

/**
 * @route   POST /api/tasks/batch/archive
 * @desc    批量归档任务
 * @access  Private
 */
router.post('/batch/archive', auth, batchDeleteValidation, taskController.batchArchiveTasks)

/**
 * @route   POST /api/tasks/archive-completed
 * @desc    归档已完成超过30天的任务
 * @access  Private
 */
router.post('/archive-completed', auth, taskController.archiveCompletedTasks)

/**
 * @route   POST /api/tasks/categories
 * @desc    创建任务类别
 * @access  Private
 */
router.post('/categories', auth, taskController.createTaskCategory)

/**
 * @route   GET /api/tasks/:id
 * @desc    获取任务详情
 * @access  Private
 */
router.get('/:id', auth, taskController.getTaskById)

/**
 * @route   GET /api/tasks/:id/activity
 * @desc    获取任务活动时间线
 * @access  Private
 */
router.get('/:id/activity', auth, taskController.getTaskActivity)

/**
 * @route   POST /api/tasks/:id/progress
 * @desc    添加进展记录
 * @access  Private
 */
router.post('/:id/progress', auth, taskController.addProgressRecord)

/**
 * @route   POST /api/tasks/:id/ai-summary
 * @desc    任务 AI 工作总结（关键节点 + 进展记录 → DeepSeek，降级基础摘要）
 * @access  Private
 */
router.post('/:id/ai-summary', auth, taskController.aiTaskSummary)

/**
 * @route   POST /api/tasks
 * @desc    创建任务
 * @access  Private
 */
router.post('/', auth, createTaskValidation, taskController.createTask)

/**
 * @route   PUT /api/tasks/:id
 * @desc    更新任务
 * @access  Private (需要编辑权限)
 */
router.put('/:id', auth, requireTaskPermission(TaskAction.EDIT), updateTaskValidation, taskController.updateTask)

/**
 * @route   PUT /api/tasks/:id/tags
 * @desc    更新任务标签
 * @access  Private (需要编辑权限)
 */
router.put('/:id/tags', auth, requireTaskPermission(TaskAction.EDIT), taskController.updateTaskTags)

/**
 * @route   PATCH /api/tasks/:id/status
 * @desc    更新任务状态（负责人、协作者也可以更新）
 * @access  Private (需要状态更新权限)
 */
router.patch('/:id/status', auth, requireTaskPermission(TaskAction.UPDATE_STATUS), updateStatusValidation, taskController.updateTaskStatus)

/**
 * @route   DELETE /api/tasks/:id
 * @desc    删除任务（软删除）
 * @access  Private (需要删除权限)
 */
router.delete('/:id', auth, requireTaskPermission(TaskAction.DELETE), taskController.deleteTask)

/**
 * @route   POST /api/tasks/:id/collaborators
 * @desc    添加任务协作者
 * @access  Private
 */
router.post('/:id/collaborators', auth, taskController.addCollaborator)

/**
 * @route   DELETE /api/tasks/:id/collaborators/:userId
 * @desc    移除任务协作者
 * @access  Private
 */
router.delete('/:id/collaborators/:userId', auth, taskController.removeCollaborator)

/**
 * @route   POST /api/tasks/:id/comments
 * @desc    添加任务评论
 * @access  Private
 */
router.post('/:id/comments', auth, taskController.addComment)

/**
 * @route   DELETE /api/tasks/:id/comments/:commentId
 * @desc    删除任务评论
 * @access  Private
 */
router.delete('/:id/comments/:commentId', auth, taskController.deleteComment)

/**
 * @route   PUT /api/tasks/:id/unarchive
 * @desc    恢复归档任务
 * @access  Private
 */
router.put('/:id/unarchive', auth, taskController.unarchiveTask)

// ===== R0 §3 任务批量导入 =====

/**
 * @route   POST /api/tasks/import/preview
 * @desc    上传 xlsx, 返回 valid/invalid 预览 (不写库)
 * @access  Private
 */
router.post(
  '/import/preview',
  auth,
  importUpload.single('file'),
  importController.previewTaskImport
)

/**
 * @route   POST /api/tasks/import
 * @desc    上传 xlsx 并执行批量导入 (单一事务, 整批回滚)
 * @access  Private
 */
router.post(
  '/import',
  auth,
  importUpload.single('file'),
  importController.executeTaskImport
)

export default router
