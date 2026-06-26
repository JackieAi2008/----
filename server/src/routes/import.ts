/**
 * 中集智历 - R0 §3 任务批量导入路由
 *
 * 挂载点:
 *   - GET  /api/import/templates/tasks.xlsx    模板下载
 *   - GET  /api/import/reports/:uuid            失败报告下载
 *
 *  任务相关:
 *   - POST /api/tasks/import/preview            预览
 *   - POST /api/tasks/import                   执行
 *
 *  preview/import 走 /api/tasks/* 是因为它们都是任务写入,在 tasks.ts 引入 multer + import 即可;
 *  本路由文件只负责 templates + reports。
 */
import { Router } from 'express'
import * as importController from '../controllers/importController.js'
import { auth } from '../middlewares/auth.js'

const router = Router()

router.get('/templates/tasks.xlsx', auth, importController.downloadTaskTemplate)
router.get('/reports/:uuid', auth, importController.downloadFailureReport)

export default router
