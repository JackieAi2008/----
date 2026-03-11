/**
 * 中集智历 - 管理路由
 */
import { Router } from 'express';
import * as adminController from '../controllers/adminController.js';
import { auth, requireAdmin } from '../middlewares/auth.js';
const router = Router();
/**
 * @route   GET /api/admin/dashboard
 * @desc    获取系统管理仪表盘数据
 * @access  Private (Admin)
 */
router.get('/dashboard', auth, requireAdmin, adminController.getAdminDashboard);
export default router;
//# sourceMappingURL=admin.js.map