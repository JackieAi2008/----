/**
 * 中集智历 - 项目路由
 */
import { Router } from 'express'
import { body } from 'express-validator'
import * as projectController from '../controllers/projectController.js'
import * as summaryController from '../controllers/summaryController.js'
import { auth } from '../middlewares/auth.js'
import { validate } from '../middlewares/validator.js'

const router = Router()

// 创建项目验证规则
const createProjectValidation = [
  body('name').notEmpty().withMessage('请输入项目名称'),
  body('visibility').isIn(['PUBLIC', 'PRIVATE']).withMessage('可见性只能是PUBLIC或PRIVATE'),
  validate
]

// 更新项目验证规则
const updateProjectValidation = [
  body('name').optional().notEmpty().withMessage('项目名称不能为空'),
  body('visibility').optional().isIn(['PUBLIC', 'PRIVATE']).withMessage('可见性只能是PUBLIC或PRIVATE'),
  validate
]

// 移交项目验证规则
const transferProjectValidation = [
  body('newOwnerId').notEmpty().withMessage('请选择新负责人'),
  validate
]

/**
 * @route   GET /api/projects
 * @desc    获取当前用户的项目列表
 * @access  Private
 */
router.get('/', auth, projectController.getProjects)

/**
 * @route   GET /api/projects/deleted
 * @desc    获取已删除的项目列表
 * @access  Private
 */
router.get('/deleted', auth, projectController.getDeletedProjects)

/**
 * @route   GET /api/projects/public
 * @desc    获取公开项目列表
 * @access  Public
 */
router.get('/public', projectController.getPublicProjects)

// ===== 子资源路由（必须早于 /:id 通配） =====

/**
 * @route   GET /api/projects/:id/summaries
 * @desc    获取项目工作总结列表
 * @access  Private (项目成员 / 全局管理员)
 */
router.get('/:id/summaries', auth, summaryController.listSummaries)

/**
 * @route   POST /api/projects/:id/summaries
 * @desc    创建工作总结（项目负责人 / 全局管理员）
 * @access  Private
 */
router.post('/:id/summaries', auth, summaryController.createSummary)

/**
 * @route   POST /api/projects/:id/summaries/:summaryId/ai-summary
 * @desc    触发 AI 总结（项目负责人 / 全局管理员 / 部门管理员）
 * @access  Private
 */
router.post('/:id/summaries/:summaryId/ai-summary', auth, summaryController.generateProjectSummaryAI)

/**
 * @route   GET /api/projects/:id/members
 * @desc    获取项目成员
 * @access  Private
 */
router.get('/:id/members', auth, projectController.getProjectMembers)

/**
 * @route   POST /api/projects/:id/members
 * @desc    添加项目成员
 * @access  Private
 */
router.post('/:id/members', auth, projectController.addMember)

/**
 * @route   DELETE /api/projects/:id/members/:userId
 * @desc    移除项目成员
 * @access  Private
 */
router.delete('/:id/members/:userId', auth, projectController.removeMember)

/**
 * @route   POST /api/projects/:id/invite
 * @desc    邀请用户加入项目
 * @access  Private
 */
router.post('/:id/invite', auth, projectController.inviteUser)

/**
 * @route   POST /api/projects/:id/invite/accept
 * @desc    接受项目邀请
 * @access  Private
 */
router.post('/:id/invite/accept', auth, projectController.acceptInvite)

/**
 * @route   POST /api/projects/:id/invite/reject
 * @desc    拒绝项目邀请
 * @access  Private
 */
router.post('/:id/invite/reject', auth, projectController.rejectInvite)

// ===== /:id 通配路由（必须放在子资源之后） =====

/**
 * @route   GET /api/projects/:id
 * @desc    获取项目详情
 * @access  Private
 */
router.get('/:id', auth, projectController.getProjectById)

/**
 * @route   POST /api/projects
 * @desc    创建项目
 * @access  Private
 */
router.post('/', auth, createProjectValidation, projectController.createProject)

/**
 * @route   PUT /api/projects/:id
 * @desc    更新项目
 * @access  Private
 */
router.put('/:id', auth, updateProjectValidation, projectController.updateProject)

/**
 * @route   DELETE /api/projects/:id
 * @desc    删除项目（软删除）
 * @access  Private
 */
router.delete('/:id', auth, projectController.deleteProject)

/**
 * @route   POST /api/projects/:id/restore
 * @desc    恢复已删除的项目
 * @access  Private
 */
router.post('/:id/restore', auth, projectController.restoreProject)

/**
 * @route   DELETE /api/projects/:id/permanent
 * @desc    永久删除项目
 * @access  Private
 */
router.delete('/:id/permanent', auth, projectController.permanentDeleteProject)

/**
 * @route   PUT /api/projects/:id/transfer
 * @desc    移交项目负责人
 * @access  Private
 */
router.put('/:id/transfer', auth, transferProjectValidation, projectController.transferProject)

/**
 * @route   PUT /api/projects/:id/archive
 * @desc    归档项目
 * @access  Private
 */
router.put('/:id/archive', auth, projectController.archiveProject)

/**
 * @route   PUT /api/projects/:id/unarchive
 * @desc    取消归档项目
 * @access  Private
 */
router.put('/:id/unarchive', auth, projectController.unarchiveProject)

export default router