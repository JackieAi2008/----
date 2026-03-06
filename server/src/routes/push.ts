/**
 * 中集智历 - 推送通知路由
 */
import { Router } from 'express'
import { body } from 'express-validator'
import * as pushController from '../controllers/pushController.js'
import { auth } from '../middlewares/auth.js'
import { validate } from '../middlewares/validator.js'

const router = Router()

// 订阅验证规则
const subscribeValidation = [
  body('subscription').isObject().withMessage('订阅信息必须是对象'),
  body('subscription.endpoint').isURL().withMessage('无效的 endpoint'),
  validate
]

// 取消订阅验证规则
const unsubscribeValidation = [
  body('endpoint').isURL().withMessage('无效的 endpoint'),
  validate
]

/**
 * @route   GET /api/push/vapid-public-key
 * @desc    获取 VAPID 公钥
 * @access  Private
 */
router.get('/vapid-public-key', auth, pushController.getVapidPublicKey)

/**
 * @route   POST /api/push/subscribe
 * @desc    订阅推送通知
 * @access  Private
 */
router.post('/subscribe', auth, subscribeValidation, pushController.subscribe)

/**
 * @route   POST /api/push/unsubscribe
 * @desc    取消订阅
 * @access  Private
 */
router.post('/unsubscribe', auth, unsubscribeValidation, pushController.unsubscribe)

/**
 * @route   GET /api/push/status
 * @desc    获取订阅状态
 * @access  Private
 */
router.get('/status', auth, pushController.getSubscriptionStatus)

/**
 * @route   POST /api/push/test
 * @desc    发送测试通知
 * @access  Private
 */
router.post('/test', auth, pushController.sendTestNotification)

export default router
