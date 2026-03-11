/**
 * 中集智历 - 部门路由
 */
import { Router } from 'express';
import * as departmentController from '../controllers/departmentController.js';
import { auth, requireAdmin, requireDepartmentAdmin } from '../middlewares/auth.js';
const router = Router();
/**
 * @route   GET /api/departments
 * @desc    获取所有部门列表
 * @access  Private (Admin)
 */
router.get('/', auth, requireAdmin, departmentController.getDepartments);
/**
 * @route   GET /api/departments/options
 * @desc    获取部门选项列表（用于下拉选择）
 * @access  Public
 */
router.get('/options', departmentController.getDepartmentOptions);
/**
 * @route   GET /api/departments/my
 * @desc    获取我管理的部门
 * @access  Private (Department Admin)
 */
router.get('/my', auth, requireDepartmentAdmin, departmentController.getMyDepartment);
/**
 * @route   GET /api/departments/:id
 * @desc    获取部门详情
 * @access  Private
 */
router.get('/:id', auth, departmentController.getDepartmentById);
/**
 * @route   GET /api/departments/:id/dashboard
 * @desc    获取部门仪表盘数据
 * @access  Private (Department Member)
 */
router.get('/:id/dashboard', auth, departmentController.getDepartmentDashboard);
/**
 * @route   GET /api/departments/:id/members/:userId
 * @desc    获取部门成员详情（含日历）
 * @access  Private (Department Member)
 */
router.get('/:id/members/:userId', auth, departmentController.getMemberDetail);
/**
 * @route   POST /api/departments
 * @desc    创建部门
 * @access  Private (Admin)
 */
router.post('/', auth, requireAdmin, departmentController.createDepartment);
/**
 * @route   PUT /api/departments/:id
 * @desc    更新部门信息
 * @access  Private (Admin)
 */
router.put('/:id', auth, requireAdmin, departmentController.updateDepartment);
/**
 * @route   DELETE /api/departments/:id
 * @desc    删除部门
 * @access  Private (Admin)
 */
router.delete('/:id', auth, requireAdmin, departmentController.deleteDepartment);
/**
 * @route   POST /api/departments/:id/members
 * @desc    添加部门成员
 * @access  Private (Department Admin)
 */
router.post('/:id/members', auth, requireDepartmentAdmin, departmentController.addMember);
/**
 * @route   DELETE /api/departments/:id/members/:userId
 * @desc    移除部门成员
 * @access  Private (Department Admin)
 */
router.delete('/:id/members/:userId', auth, requireDepartmentAdmin, departmentController.removeMember);
/**
 * @route   PUT /api/departments/:id/admin
 * @desc    更换部门管理员
 * @access  Private (Admin)
 */
router.put('/:id/admin', auth, requireAdmin, departmentController.changeAdmin);
export default router;
//# sourceMappingURL=departments.js.map