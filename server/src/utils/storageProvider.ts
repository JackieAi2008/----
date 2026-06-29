/**
 * 中集智历 - 存储抽象 (r1 §6a)
 *
 * 现状: 本地 fs 实现
 * 未来: 实现 StorageProvider interface 接 OSS / S3 / 等
 * 设计 doc §6 风险登记 oss 迁移兼容性 P3
 */
import path from 'path'
import fs from 'fs'
import { logger } from './logger.js'

const UPLOAD_ROOT = path.join(process.cwd(), 'uploads', 'library')

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

/**
 * 计算 YYYY/MM 路径 (e.g. "2026/06")
 */
function yearMonthDir(now: Date = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  return path.join(UPLOAD_ROOT, String(y), m)
}

/**
 * 生成唯一磁盘文件名: `<timestamp>-<rand><ext>`
 */
export function buildFilename(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase()
  const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
  return `${unique}${ext}`
}

/**
 * 把文件从 multer 临时路径挪到 YYYY/MM 目录
 *
 * @returns 相对路径 (相对 process.cwd())
 */
export function persistUploadedFile(
  tempPath: string,
  filename: string
): { storagePath: string; absolutePath: string } {
  const dir = yearMonthDir()
  ensureDir(dir)
  const absolutePath = path.join(dir, filename)
  // 用 rename 原子移动 (同盘 mv 原子); 跨盘会 fallback 到 copy+unlink
  try {
    fs.renameSync(tempPath, absolutePath)
  } catch (e) {
    // fallback: copy + unlink
    fs.copyFileSync(tempPath, absolutePath)
    try {
      fs.unlinkSync(tempPath)
    } catch (err) {
      logger.warn('清理临时文件失败', { tempPath, err })
    }
    void e
  }
  const storagePath = path.relative(process.cwd(), absolutePath)
  return { storagePath, absolutePath }
}

/**
 * 安全删除磁盘文件 (无引用时报错静默)
 */
export function deleteFileSafe(absolutePath: string): void {
  if (!absolutePath) return
  if (!fs.existsSync(absolutePath)) return
  try {
    fs.unlinkSync(absolutePath)
    logger.info('已删除磁盘文件', { absolutePath })
  } catch (e) {
    logger.warn('删除磁盘文件失败', { absolutePath, e })
  }
}

/**
 * 物理绝对路径 (供 res.sendFile)
 */
export function toAbsolutePath(storagePath: string): string {
  if (path.isAbsolute(storagePath)) return storagePath
  return path.join(process.cwd(), storagePath)
}

/**
 * 物理删除整个 YYYY/MM 目录里的孤儿文件
 * (本轮暂不实现, 留给 §6d 或 P2 磁盘监控)
 */
export function listAllAbsolutePaths(): string[] {
  ensureDir(UPLOAD_ROOT)
  const result: string[] = []
  function walk(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(p)
      else if (entry.isFile()) result.push(p)
    }
  }
  walk(UPLOAD_ROOT)
  return result
}
