/**
 * 中集智历 - 任务模板路由
 */
import { Router } from 'express'
import { body } from 'express-validator'
import * as templateController from '../controllers/templateController.js'
import { auth } from '../middlewares/auth.js'
import { validate } from '../middlewares/validator.js'

const router = Router()

// 创建模板验证规则
const createTemplateValidation = [
  body('title').notEmpty().withMessage('请输入模板标题'),
  body('priority').optional().isIn(['HIGH', 'MEDIUM', 'LOW']).withMessage('无效的优先级'),
  validate
]

// 更新模板验证规则
const updateTemplateValidation = [
  body('title').optional().notEmpty().withMessage('模板标题不能为空'),
  body('priority').optional().isIn(['HIGH', 'MEDIUM', 'LOW']).withMessage('无效的优先级'),
  validate
]

/**
 * @route   GET /api/templates
 * @desc    获取任务模板列表
 * @access  Private
 */
router.get('/', auth, templateController.getTemplates)

/**
 * @route   GET /api/templates/:id
 * @desc    获取任务模板详情
 * @access  Private
 */
router.get('/:id', auth, templateController.getTemplateById)

/**
 * @route   POST /api/templates
 * @desc    创建任务模板
 * @access  Private
 */
router.post('/', auth, createTemplateValidation, templateController.createTemplate)

/**
 * @route   POST /api/templates/from-task/:taskId
 * @desc    从任务创建模板
 * @access  Private
 */
router.post('/from-task/:taskId', auth, templateController.createTemplateFromTask)

/**
 * @route   PUT /api/templates/:id
 * @desc    更新任务模板
 * @access  Private
 */
router.put('/:id', auth, updateTemplateValidation, templateController.updateTemplate)

/**
 * @route   DELETE /api/templates/:id
 * @desc    删除任务模板
 * @access  Private
 */
router.delete('/:id', auth, templateController.deleteTemplate)

export default router
