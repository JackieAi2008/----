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
 * @route   POST /api/users/create
 * @desc    管理员创建用户
 * @access  Private (Admin)
 */
router.post('/create', auth, requireAdmin, userController.createUser)

/**
 * @route   GET /api/users/search
 * @desc    搜索用户（用于跨部门邀请）
 * @access  Private
 */
router.get('/search', auth, userController.searchUsers)

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
 * @route   PUT /api/users/:id/status
 * @desc    切换用户状态（启用/禁用）
 * @access  Private (Admin)
 */
router.put('/:id/status', auth, requireAdmin, userController.toggleUserStatus)

/**
 * @route   DELETE /api/users/:id
 * @desc    删除用户
 * @access  Private (Admin)
 */
router.delete('/:id', auth, requireAdmin, userController.deleteUser)

/**
 * @route   POST /api/users/:id/transfer-admin
 * @desc    转让管理员权限
 * @access  Private (Admin)
 */
router.post('/:id/transfer-admin', auth, requireAdmin, userController.transferAdmin)

// ========== 部门管理员功能 ==========

/**
 * @route   GET /api/users/department/members
 * @desc    获取部门成员列表（部门管理员）
 * @access  Private (Department Admin)
 */
router.get('/department/members', auth, userController.getDepartmentMembers)

/**
 * @route   POST /api/users/:id/transfer-department-admin
 * @desc    转让部门管理员权限
 * @access  Private (Department Admin)
 */
router.post('/:id/transfer-department-admin', auth, userController.transferDepartmentAdmin)

/**
 * @route   DELETE /api/users/:id/department
 * @desc    移除部门成员（部门管理员）
 * @access  Private (Department Admin)
 */
router.delete('/:id/department', auth, userController.removeDepartmentMember)

/**
 * @route   PUT /api/users/:id/department-status
 * @desc    禁用/启用部门成员（部门管理员）
 * @access  Private (Department Admin)
 */
router.put('/:id/department-status', auth, userController.toggleDepartmentMemberStatus)

export default router
