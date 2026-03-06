/**
 * 中集智历 - 搜索路由
 */
import { Router } from 'express';
import * as searchController from '../controllers/searchController.js';
import { auth } from '../middlewares/auth.js';
const router = Router();
/**
 * @route   GET /api/search
 * @desc    全局搜索（任务、项目、用户）
 * @query   keyword - 搜索关键词（至少2个字符）
 * @query   types - 搜索类型，逗号分隔 (task,project,user)，默认全部
 * @access  Private
 */
router.get('/', auth, searchController.globalSearch);
/**
 * @route   GET /api/search/tasks
 * @desc    快速搜索任务
 * @query   keyword - 搜索关键词
 * @query   projectId - 项目ID（可选）
 * @access  Private
 */
router.get('/tasks', auth, searchController.searchTasks);
/**
 * @route   GET /api/search/projects
 * @desc    快速搜索项目
 * @query   keyword - 搜索关键词
 * @access  Private
 */
router.get('/projects', auth, searchController.searchProjects);
export default router;
//# sourceMappingURL=search.js.map