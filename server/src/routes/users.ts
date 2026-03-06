/**
 * 中集智历 - 用户路由
 */
import { Router } from 'express'
import * as userController from '../controllers/userController.js'
import { auth, requireAdmin } from '../middlewares/auth.js'

const router = Router()

/**
 * @route   GET /api/users
 * @desc    获取用户列表
 * @access  Private (Admin)
 */
router.get('/', auth, requireAdmin, userController.getUsers)

/**
 * @route   GET /api/users/:id
 * @desc    获取用户详情
 * @access  Private
 */
router.get('/:id', auth, userController.getUserById)

/**
 * @route   PUT /api/users/:id
 * @desc    更新用户信息
 * @access  Private
 */
router.put('/:id', auth, userController.updateUser)

/**
 * @route   GET /api/users/search
 * @desc    搜索用户
 * @access  Private
 */
router.get('/search', auth, userController.searchUsers)

export default router
