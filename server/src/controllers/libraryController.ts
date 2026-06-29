/**
 * 中集智历 - 资料库控制器 (r1 §6a)
 *
 * 5 个端点:
 *   POST   /api/library/upload      单图上传 (multipart, 5MB + 容量校验)
 *   GET    /api/library             列表 (OR 矩阵过滤 + 分页 + 排序)
 *   GET    /api/library/:id         单个详情
 *   DELETE /api/library/:id         软删 (owner + admin)
 *   POST   /api/library/:id/restore 恢复 (owner + admin)
 */
import type { Request, Response } from 'express'
import path from 'path'
import prisma from '../config/database.js'
import {
  LibraryError,
  VISIBILITY,
  Visibility,
  assertProjectVisibleToOwner,
  getAssetById,
  listAssets,
  reserveQuota,
  restoreAsset,
  softDeleteAsset,
  validateUploadInput
} from '../services/libraryService.js'
import { persistUploadedFile } from '../utils/storageProvider.js'
import { writeAuditLog } from '../utils/auditLogger.js'

interface AuthedRequest extends Request {
  userId?: string
  userRole?: 'ADMIN' | 'MEMBER' | string
  isAdmin?: boolean
}

function getCurrentUser(req: AuthedRequest) {
  if (!req.userId) throw new LibraryError(401, 'UNAUTHENTICATED', '未登录')
  return {
    id: req.userId,
    isAdmin: req.isAdmin === true || req.userRole === 'ADMIN',
    departmentId: null as string | null // 加载时取真实值
  }
}

async function loadCurrentUser(req: AuthedRequest) {
  const base = getCurrentUser(req)
  const user = await prisma.user.findUnique({
    where: { id: base.id },
    select: { departmentId: true, isAdmin: true }
  })
  return {
    id: base.id,
    isAdmin: user?.isAdmin ?? base.isAdmin,
    departmentId: user?.departmentId ?? null
  }
}

function handleLibraryError(err: unknown, res: Response): boolean {
  if (err instanceof LibraryError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.code,
      message: err.message,
      ...err.details
    })
    return true
  }
  return false
}

// ───────── POST /api/library/upload ─────────
export async function upload(req: AuthedRequest, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'NO_FILE', message: '请选择要上传的文件' })
    }
    const userId = req.userId!
    const { title, visibility, projectId, tags, uploaderNote } = req.body as {
      title?: string
      visibility?: string
      projectId?: string
      tags?: string
      uploaderNote?: string
    }

    // 校验 visibility 枚举
    const vis: Visibility = (VISIBILITY as readonly string[]).includes(visibility ?? '')
      ? (visibility as Visibility)
      : 'DEPARTMENT'

    validateUploadInput({
      size: req.file.size,
      mimeType: req.file.mimetype,
      visibility: vis,
      projectId: projectId ?? null
    })

    // 持久化文件 (从 multer 临时目录挪到 YYYY/MM/)
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(req.file.originalname).toLowerCase()}`
    const { storagePath } = persistUploadedFile(req.file.path, filename)

    // 默认 title = 原始文件名去后缀
    const finalTitle = (title?.trim() || req.file.originalname.replace(/\.[^.]+$/, '')).slice(0, 200)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { departmentId: true }
    })
    const departmentId = user?.departmentId ?? null

    // 事务: 校验 projectId + 预留配额 + 写入 row
    const asset = await prisma.$transaction(async (tx) => {
      const proj = await assertProjectVisibleToOwner(tx, vis, projectId ?? null, userId)
      await reserveQuota(tx, userId, req.file!.size)
      return tx.libraryAsset.create({
        data: {
          title: finalTitle,
          originalName: req.file!.originalname,
          filename,
          mimeType: req.file!.mimetype,
          size: req.file!.size,
          storagePath,
          visibility: vis,
          projectId: proj.projectId,
          departmentId,
          ownerId: userId,
          tags: tags?.trim() || null,
          uploaderNote: uploaderNote?.trim() || null
        }
      })
    })

    await writeAuditLog({
      userId,
      action: 'LIBRARY_UPLOAD',
      targetType: 'LIBRARY_ASSET',
      targetId: asset.id,
      details: { size: asset.size, visibility: asset.visibility }
    })

    res.status(201).json({
      success: true,
      data: {
        id: asset.id,
        title: asset.title,
        originalName: asset.originalName,
        mimeType: asset.mimeType,
        size: asset.size,
        visibility: asset.visibility,
        projectId: asset.projectId,
        ownerId: asset.ownerId,
        tags: asset.tags ? asset.tags.split(',').map((s) => s.trim()).filter(Boolean) : [],
        createdAt: asset.createdAt
      }
    })
  } catch (err) {
    // 失败时尝试删除磁盘文件
    if (req.file?.path) {
      try {
        const fs = await import('fs')
        fs.unlinkSync(req.file.path)
      } catch {
        // ignore
      }
    }
    if (handleLibraryError(err, res)) return
    res.status(500).json({ success: false, error: 'INTERNAL', message: '上传失败' })
  }
}

// ───────── GET /api/library ─────────
export async function list(req: AuthedRequest, res: Response) {
  try {
    const currentUser = await loadCurrentUser(req)
    const q = req.query as Record<string, string | undefined>
    const page = Math.max(1, Number(q.page) || 1)
    const pageSize = Math.min(100, Math.max(1, Number(q.pageSize) || 24))
    const sort = (['createdAt', 'originalName', 'size'] as const).find((s) => s === q.sort) ?? 'createdAt'
    const order = q.order === 'asc' ? 'asc' : 'desc'
    const visibility = (VISIBILITY as readonly string[]).includes(q.visibility ?? '')
      ? (q.visibility as Visibility)
      : null
    const data = await listAssets(currentUser, {
      page,
      pageSize,
      sort,
      order,
      visibility,
      projectId: q.projectId ?? null,
      ownerId: q.ownerId ?? null,
      tag: q.tag ?? null,
      search: q.search ?? null,
      mimeTypePrefix: q.mimeType ?? null,
      includeDeleted: false
    })
    res.json({ success: true, data })
  } catch (err) {
    if (handleLibraryError(err, res)) return
    res.status(500).json({ success: false, message: '查询失败' })
  }
}

// ───────── GET /api/library/:id ─────────
export async function detail(req: AuthedRequest, res: Response) {
  try {
    const currentUser = await loadCurrentUser(req)
    const asset = await getAssetById(currentUser, req.params.id)
    res.json({ success: true, data: asset })
  } catch (err) {
    if (handleLibraryError(err, res)) return
    res.status(500).json({ success: false, message: '查询失败' })
  }
}

// ───────── DELETE /api/library/:id (soft) ─────────
export async function softDelete(req: AuthedRequest, res: Response) {
  try {
    const currentUser = await loadCurrentUser(req)
    await softDeleteAsset(currentUser, req.params.id)
    await writeAuditLog({
      userId: currentUser.id,
      action: 'LIBRARY_SOFT_DELETE',
      targetType: 'LIBRARY_ASSET',
      targetId: req.params.id
    })
    res.json({ success: true, message: '已移到回收站, 30 天后自动清理' })
  } catch (err) {
    if (handleLibraryError(err, res)) return
    res.status(500).json({ success: false, message: '删除失败' })
  }
}

// ───────── POST /api/library/:id/restore ─────────
export async function restore(req: AuthedRequest, res: Response) {
  try {
    const currentUser = await loadCurrentUser(req)
    await restoreAsset(currentUser, req.params.id)
    await writeAuditLog({
      userId: currentUser.id,
      action: 'LIBRARY_RESTORE',
      targetType: 'LIBRARY_ASSET',
      targetId: req.params.id
    })
    res.json({ success: true, message: '已恢复' })
  } catch (err) {
    if (handleLibraryError(err, res)) return
    res.status(500).json({ success: false, message: '恢复失败' })
  }
}
