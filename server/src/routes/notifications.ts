/**
 * 中集智历 - 通知路由
 */
import { Router } from 'express'
import * as notificationController from '../controllers/notificationController.js'
import { auth } from '../middlewares/auth.js'

const router = Router()

/**
 * @route   GET /api/notifications
 * @desc    获取通知列表
 * @access  Private
 */
router.get('/', auth, notificationController.getNotifications)

/**
 * @route   GET /api/notifications/unread-count
 * @desc    获取未读通知数量
 * @access  Private
 */
router.get('/unread-count', auth, notificationController.getUnreadCount)

/**
 * @route   POST /api/notifications/:id/read
 * @desc    标记通知为已读
 * @access  Private
 */
router.post('/:id/read', auth, notificationController.markAsRead)

/**
 * @route   POST /api/notifications/read-all
 * @desc    标记所有通知为已读
 * @access  Private
 */
router.post('/read-all', auth, notificationController.markAllAsRead)

/**
 * @route   DELETE /api/notifications/:id
 * @desc    删除通知
 * @access  Private
 */
router.delete('/:id', auth, notificationController.deleteNotification)

export default router
