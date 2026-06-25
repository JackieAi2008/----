/**
 * 中集智历 - 仪表盘路由
 */
import { Router } from 'express'
import * as dashboardController from '../controllers/dashboardController.js'
import * as aiSummaryController from '../controllers/aiSummaryController.js'
import { auth } from '../middlewares/auth.js'
import { aiSummaryLimiter } from '../middlewares/rateLimiter.js'

const router = Router()

/**
 * @route   GET /api/dashboard
 * @desc    获取仪表盘数据
 * @access  Private
 */
router.get('/', auth, dashboardController.getDashboard)

/**
 * @route   GET /api/dashboard/stats
 * @desc    获取工作统计
 * @access  Private
 */
router.get('/stats', auth, dashboardController.getWorkStats)

/**
 * @route   POST /api/dashboard/ai-summary
 * @desc    生成AI智能工作总结
 * @access  Private
 */
router.post('/ai-summary', auth, aiSummaryLimiter, aiSummaryController.generateAISummary)

/**
 * @route   GET /api/dashboard/yearly
 * @desc    获取年度看板数据 (R0 阶段 2)
 * @query   year: number (2000..2100)
 * @access  Private
 */
router.get('/yearly', auth, dashboardController.getYearlyDashboardController)

export default router
