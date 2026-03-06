/**
 * 中集智历 - 导出控制器
 * 支持ICS日历导出、Excel导出、PDF导出
 */
import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.js';
/**
 * 导出ICS日历文件
 * GET /api/export/ics
 */
export declare function exportICS(req: AuthRequest, res: Response): Promise<void>;
/**
 * 导出Excel任务列表
 * GET /api/export/excel
 * 注意：需要安装 exceljs 库
 */
export declare function exportExcel(req: AuthRequest, res: Response): Promise<void>;
/**
 * 导出PDF工作总结
 * GET /api/export/pdf
 * 注意：需要安装 pdfkit 库
 */
export declare function exportPDF(req: AuthRequest, res: Response): Promise<void>;
/**
 * 导出任务JSON数据
 * GET /api/export/json
 */
export declare function exportJSON(req: AuthRequest, res: Response): Promise<void>;
//# sourceMappingURL=exportController.d.ts.map