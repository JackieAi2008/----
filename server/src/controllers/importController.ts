/**
 * 中集智历 - R0 §3 任务批量导入 controller
 */
import { Request, Response } from 'express'
import prisma from '../config/database.js'
import { AuthRequest } from '../middlewares/auth.js'
import { ApiError } from '../middlewares/errorHandler.js'
import {
  buildTemplateBuffer,
  previewImport,
  commitImport,
  readFailureReport
} from '../services/importService.js'

/** GET /api/import/templates/tasks.xlsx */
export async function downloadTaskTemplate(req: AuthRequest, res: Response) {
  const userId = req.userId!
  const isAdmin = req.userRole === 'ADMIN'

  // 收集: 用户可用的项目 + 所有用户 + 交付物 + 分类
  const projectWhere = isAdmin
    ? { isArchived: false, deletedAt: null }
    : { isArchived: false, deletedAt: null, OR: [{ ownerId: userId }, { members: { some: { userId } } }] }

  const [projects, users, deliverables, categories] = await Promise.all([
    prisma.project.findMany({ where: projectWhere, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.user.findMany({ where: { isBanned: false }, select: { id: true, nickname: true, email: true }, orderBy: { nickname: 'asc' } }),
    prisma.deliverableOption.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.taskCategory.findMany({ select: { id: true, name: true, projectId: true } })
  ])

  // 防御: nickname 可能为 null,统一用 email 兜底
  const safeUsers = users.map(u => ({ ...u, nickname: u.nickname || u.email }))

  const buffer = await buildTemplateBuffer({ projects, users: safeUsers, deliverables, categories })

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', `attachment; filename="cimc-tasks-template-${new Date().toISOString().split('T')[0]}.xlsx"`)
  res.setHeader('Content-Length', buffer.length)
  res.send(buffer)
}

/** POST /api/tasks/import/preview — multipart/form-data file=file */
export async function previewTaskImport(req: AuthRequest, res: Response) {
  const userId = req.userId!
  const isAdmin = req.userRole === 'ADMIN'
  const file = (req as Request & { file?: Express.Multer.File }).file
  if (!file) {
    throw new ApiError(400, '未上传文件,请选择 .xlsx 文件')
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new ApiError(400, '文件不能超过 10MB')
  }
  if (!/\.xlsx$/.test(file.originalname) && file.mimetype !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
    throw new ApiError(400, '仅支持 .xlsx 文件')
  }

  const result = await previewImport(userId, isAdmin, file.buffer)

  res.json({
    success: true,
    data: result
  })
}

/** POST /api/tasks/import — multipart/form-data file=file */
export async function executeTaskImport(req: AuthRequest, res: Response) {
  const userId = req.userId!
  const isAdmin = req.userRole === 'ADMIN'
  const file = (req as Request & { file?: Express.Multer.File }).file
  if (!file) {
    throw new ApiError(400, '未上传文件,请选择 .xlsx 文件')
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new ApiError(400, '文件不能超过 10MB')
  }
  if (!/\.xlsx$/.test(file.originalname) && file.mimetype !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
    throw new ApiError(400, '仅支持 .xlsx 文件')
  }

  const result = await commitImport(userId, isAdmin, file.buffer)

  if (result.success) {
    res.json({
      success: true,
      data: {
        imported: result.imported,
        taskIds: result.taskIds,
        rows: result.rows.map(r => ({ row: r.row, taskId: r.taskId }))
      }
    })
    return
  }

  // 失败: 返回 200 (业务错误) + failureReportUrl 让前端展示下载
  res.status(200).json({
    success: false,
    message: '导入失败,整批回滚',
    data: {
      imported: 0,
      failed: result.failed,
      errors: result.errors,
      failureReportUrl: result.failureReportUrl
    }
  })
}

/** GET /api/import/reports/:uuid — 下载失败报告 */
export async function downloadFailureReport(req: AuthRequest, res: Response) {
  const { uuid } = req.params
  if (!uuid) {
    throw new ApiError(400, '报告 ID 不能为空')
  }
  const report = await readFailureReport(uuid)
  if (!report) {
    throw new ApiError(404, '报告不存在或已过期(3 天后清理)')
  }
  res.download(report.path, report.filename)
}
