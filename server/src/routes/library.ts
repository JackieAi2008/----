/**
 * 中集智历 - 资料库路由 (r1 §6a)
 *
 * 5 个端点 (设计 doc §3):
 *   POST   /api/library/upload        单图上传 (multipart, 5MB + 容量校验)
 *   GET    /api/library               列表 (OR 矩阵过滤)
 *   GET    /api/library/:id           详情
 *   DELETE /api/library/:id           软删 (owner + admin)
 *   POST   /api/library/:id/restore   恢复 (owner + admin)
 *
 * 留待 §6b/c/d: GET /:id/file / PATCH /:id / DELETE /:id/hard /
 *               GET /recycle-bin / GET /tags / POST /batch-download / POST /batch-delete
 */
import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import * as libraryController from '../controllers/libraryController.js'
import { auth } from '../middlewares/auth.js'
import { MAX_FILE_SIZE } from '../services/libraryService.js'

const router = Router()

// multer 临时存储 (用 OS tmp 或 uploads/.tmp)
const TMP_DIR = path.join(process.cwd(), 'uploads', '.tmp')
if (!fs.existsSync(TMP_DIR)) {
  fs.mkdirSync(TMP_DIR, { recursive: true })
}
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, TMP_DIR),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, `${unique}${ext}`)
  }
})
const fileFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // 上传时只放行 image/* (精确 mime 白名单; 二次 file-type magic 校验留 §6b/c)
  if (file.mimetype.startsWith('image/')) {
    cb(null, true)
  } else {
    cb(new Error(`UNSUPPORTED_MIME: ${file.mimetype}`))
  }
}
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE }
})

// ───────── 端点 ─────────
router.post('/upload', auth, upload.single('file'), libraryController.upload)
router.get('/', auth, libraryController.list)
router.get('/:id', auth, libraryController.detail)
router.delete('/:id', auth, libraryController.softDelete)
router.post('/:id/restore', auth, libraryController.restore)

export default router
