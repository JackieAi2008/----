/**
 * 中集智历 - 评价路由
 */
import { Router } from 'express'
import { body } from 'express-validator'
import * as evaluationController from '../controllers/evaluationController.js'
import { auth } from '../middlewares/auth.js'
import { validate } from '../middlewares/validator.js'

const router = Router()

// 创建/更新评价验证规则
const createEvaluationValidation = [
  body('taskId').notEmpty().withMessage('请指定任务'),
  body('targetUserId').notEmpty().withMessage('请指定被评价人'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('评分为1-5星'),
  body('comment').optional().isString(),
  validate
]

/**
 * @route   POST /api/evaluations
 * @desc    创建/更新评价（仅管理员）
 * @access  Private (Admin only)
 */
router.post('/', auth, createEvaluationValidation, evaluationController.createEvaluation)

/**
 * @route   GET /api/evaluations/task/:id
 * @desc    获取任务的评价列表
 * @access  Private
 */
router.get('/task/:id', auth, evaluationController.getTaskEvaluations)

/**
 * @route   GET /api/evaluations/user-stats
 * @desc    获取人员评价统计（按人分组）
 * @access  Private (Admin only)
 */
router.get('/user-stats', auth, evaluationController.getUserEvaluationStats)

/**
 * @route   GET /api/evaluations/project-stats
 * @desc    获取项目评价统计（按项目分组）
 * @access  Private (Admin only)
 */
router.get('/project-stats', auth, evaluationController.getProjectEvaluationStats)

export default router
