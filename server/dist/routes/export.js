/**
 * 中集智历 - 导出路由
 */
import { Router } from 'express';
import * as exportController from '../controllers/exportController.js';
import { auth } from '../middlewares/auth.js';
const router = Router();
/**
 * @route   GET /api/export/ics
 * @desc    导出ICS日历文件
 * @query   startDate - 开始日期 (可选)
 * @query   endDate - 结束日期 (可选)
 * @query   projectId - 项目ID (可选)
 * @access  Private
 */
router.get('/ics', auth, exportController.exportICS);
/**
 * @route   GET /api/export/excel
 * @desc    导出Excel/CSV任务列表
 * @query   startDate - 开始日期 (可选)
 * @query   endDate - 结束日期 (可选)
 * @query   projectId - 项目ID (可选)
 * @query   status - 任务状态 (可选)
 * @access  Private
 */
router.get('/excel', auth, exportController.exportExcel);
/**
 * @route   GET /api/export/pdf
 * @desc    导出PDF工作总结
 * @query   startDate - 开始日期 (可选)
 * @query   endDate - 结束日期 (可选)
 * @query   summaryType - 总结类型 (weekly/monthly/quarterly, 可选)
 * @access  Private
 */
router.get('/pdf', auth, exportController.exportPDF);
/**
 * @route   GET /api/export/json
 * @desc    导出JSON格式任务数据
 * @query   startDate - 开始日期 (可选)
 * @query   endDate - 结束日期 (可选)
 * @query   projectId - 项目ID (可选)
 * @query   status - 任务状态 (可选)
 * @access  Private
 */
router.get('/json', auth, exportController.exportJSON);
export default router;
//# sourceMappingURL=export.js.map