/**
 * 中集智历 - 消息中心路由 (r0 §4)
 *
 * 新端点,与老 /api/notifications 并存。
 */
import { Router } from 'express'
import * as messagesController from '../controllers/messagesController.js'
import { auth } from '../middlewares/auth.js'

const router = Router()

/**
 * @route   GET /api/messages
 * @desc    消息列表(分页 + 过滤)
 * @access  Private
 */
router.get('/', auth, messagesController.listMessages)

/**
 * @route   GET /api/messages/unread-count-by-category
 * @desc    按 category 聚合的未读数(铃铛角标用)
 * @access  Private
 */
router.get(
  '/unread-count-by-category',
  auth,
  messagesController.unreadCountByCategory
)

/**
 * @route   POST /api/messages/mark-all-read
 * @desc    标记全部(或单 category)已读
 * @access  Private
 */
router.post('/mark-all-read', auth, messagesController.markAllRead)

/**
 * @route   POST /api/messages/:id/read
 * @desc    标记单条已读
 * @access  Private
 */
router.post('/:id/read', auth, messagesController.markOneRead)

export default router
