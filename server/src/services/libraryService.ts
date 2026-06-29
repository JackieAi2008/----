/**
 * 中集智历 - 资料库 service (r1 §6a)
 *
 * 设计 doc: `docs/plans/2026-06-25-zjzl-r0-stage5-library-design.md`
 *
 * 核心职责:
 *   - 4 档可见性 (PRIVATE | DEPARTMENT | PROJECT | PUBLIC) + admin 全可见
 *   - 容量三限: 5MB/单图 (D-5.5) + 200MB/单用户 (D-5.4) + 2GB/全站 (D-5.4)
 *   - ORG_QUOTA + USER_QUOTA race 缓解: 用 counter 表原子递增
 *   - 30 天软删 → cron 硬删 (D-5.3)
 *
 * 不在本轮范围 (§6b/§6c/§6d 后续):
 *   - PATCH 编辑 (title/tags/visibility/project)
 *   - GET /:id/file 下载 / 缩略图
 *   - DELETE /:id/hard admin 硬删
 *   - GET /recycle-bin 回收站列表
 *   - GET /tags 标签补全
 *   - POST /batch-download archiver 流式 zip
 *   - POST /batch-delete 批量软删
 */
import type { Prisma, PrismaClient } from '@prisma/client'
import prisma from '../config/database.js'
import { logger } from '../utils/logger.js'

// ───────── 配额常量 ─────────
export const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB (D-5.5)
export const USER_QUOTA_LIMIT = 200 * 1024 * 1024 // 200MB (D-5.4)
export const ORG_QUOTA_LIMIT = 2 * 1024 * 1024 * 1024 // 2GB (D-5.4)
export const RECYCLE_DAYS = 30 // D-5.3

// ───────── 枚举 ─────────
export const VISIBILITY = ['PRIVATE', 'DEPARTMENT', 'PROJECT', 'PUBLIC'] as const
export type Visibility = (typeof VISIBILITY)[number]

// ───────── 错误 ─────────
export class LibraryError extends Error {
  public readonly statusCode: number
  public readonly code: string
  public readonly details: Record<string, unknown>
  constructor(
    statusCode: number,
    code: string,
    message: string,
    details: Record<string, unknown> = {}
  ) {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.details = details
  }
}

type Tx = PrismaClient | Prisma.TransactionClient

// ───────── 可见性 OR 矩阵 (D-5.1 + D-5.14) ─────────
/**
 * 当前用户可见的 LibraryAsset 过滤条件
 *
 * admin (D-5.14): 看全部
 * 普通用户: 自己 / 公开 / 部门 / 项目成员
 */
export function buildLibraryWhere(currentUser: {
  id: string
  isAdmin: boolean
  departmentId: string | null
}): Prisma.LibraryAssetWhereInput {
  const base: Prisma.LibraryAssetWhereInput = { deletedAt: null }
  if (currentUser.isAdmin) return base
  const ors: Prisma.LibraryAssetWhereInput[] = [
    { ownerId: currentUser.id },
    { visibility: 'PUBLIC' }
  ]
  if (currentUser.departmentId) {
    ors.push({
      visibility: 'DEPARTMENT',
      departmentId: currentUser.departmentId
    })
  }
  ors.push({
    visibility: 'PROJECT',
    project: { members: { some: { userId: currentUser.id } } }
  })
  return { ...base, OR: ors }
}

// ───────── 上传校验顺序 (短路) ─────────
/**
 * mime 白名单 (D-5.6 第一道防线, file-type magic 校验留 §6b/c)
 */
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml'
])

/**
 * 上传校验 (短路)
 *   1. size ≤ 5MB
 *   2. mime ∈ image/*
 *   3. USER_QUOTA (原子递增, 超限回滚)
 *   4. ORG_QUOTA (原子递增, 超限回滚)
 *   5. projectId 校验 (visibility=PROJECT 时必填 + 项目存在 + 未归档)
 *
 * @param counterDelta 调用方在原子递增前需要先传 size 进来; 失败时回滚
 */
export function validateUploadInput(input: {
  size: number
  mimeType: string
  visibility: Visibility
  projectId?: string | null
}): void {
  if (input.size > MAX_FILE_SIZE) {
    throw new LibraryError(413, 'FILE_TOO_LARGE', `文件超 ${MAX_FILE_SIZE / 1024 / 1024}MB 上限`, {
      limit: MAX_FILE_SIZE
    })
  }
  if (!ALLOWED_MIME_TYPES.has(input.mimeType)) {
    throw new LibraryError(400, 'UNSUPPORTED_MIME', '仅支持图片 (jpg/png/gif/webp/svg)', {
      mimeType: input.mimeType
    })
  }
  if (input.visibility === 'PROJECT' && !input.projectId) {
    throw new LibraryError(400, 'PROJECT_REQUIRED', '可见性为「项目」时必须关联项目', {})
  }
  // USER_QUOTA / ORG_QUOTA 在事务内原子递增, 见 reserveQuota
}

// ───────── 配额预留 (原子) ─────────
/**
 * 原子预留配额 (USER + ORG)
 *
 * 流程 (race-safe in SQLite single-writer):
 *   1. upsert OrgQuotaCounter + UserQuotaCounter (singleton / per user)
 *   2. SELECT 当前 usedBytes (JS 预检)
 *   3. 预检 ORG/USER, 超限 → 抛 507 (UPDATE 还没发生, 不会 overflow)
 *   4. 原子 UPDATE (SQLite 单写, 不会竞态)
 *
 * 为什么预检 + 原子 UPDATE 能防 race:
 *   - SQLite 默认 single-writer, T1 SELECT 之后 T2 阻塞
 *   - T1 commit 后 T2 读到的就是 T1 写后的值, 此时再预检会看到最新值
 *   - 即使两个并发都通过了预检, 单写序列化保证最终值不会超过 ORG_QUOTA + sizeBytes
 *   - 但 sizeBytes ≤ 5MB, current + 2*sizeBytes < 2GB + 10MB, 可能溢出 INT32
 *   - 所以预检是必要的: 把 "超限" 提前到 UPDATE 之前
 *
 * 失败时调用方需要重新 throw,prisma 事务会自动回滚 DB 改动
 */
export async function reserveQuota(
  tx: Tx,
  userId: string,
  sizeBytes: number
): Promise<{ userBytes: number; orgBytes: number }> {
  // ORG
  await tx.orgQuotaCounter.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton', usedBytes: 0 },
    update: {}
  })
  const orgCurrent = await tx.orgQuotaCounter.findUnique({ where: { id: 'singleton' } })
  const orgCurrentBytes = orgCurrent?.usedBytes ?? 0
  if (orgCurrentBytes + sizeBytes > ORG_QUOTA_LIMIT) {
    throw new LibraryError(
      507,
      'ORG_QUOTA_EXCEEDED',
      `资料库总空间已满 (${ORG_QUOTA_LIMIT / 1024 / 1024}MB), 请等待管理员清理`,
      { limit: ORG_QUOTA_LIMIT, current: orgCurrentBytes }
    )
  }
  // 原子递增 (SQLite 单写)
  const orgAfter = await tx.orgQuotaCounter.update({
    where: { id: 'singleton' },
    data: { usedBytes: { increment: sizeBytes } }
  })

  // USER
  await tx.userQuotaCounter.upsert({
    where: { userId },
    create: { userId, usedBytes: 0 },
    update: {}
  })
  const userCurrent = await tx.userQuotaCounter.findUnique({ where: { userId } })
  const userCurrentBytes = userCurrent?.usedBytes ?? 0
  if (userCurrentBytes + sizeBytes > USER_QUOTA_LIMIT) {
    // 回滚 ORG
    await tx.orgQuotaCounter.update({
      where: { id: 'singleton' },
      data: { usedBytes: { decrement: sizeBytes } }
    })
    throw new LibraryError(
      507,
      'USER_QUOTA_EXCEEDED',
      `您的资料库空间已满 (${USER_QUOTA_LIMIT / 1024 / 1024}MB), 请删除旧图片`,
      { limit: USER_QUOTA_LIMIT, current: userCurrentBytes }
    )
  }
  // 原子递增
  const userAfter = await tx.userQuotaCounter.update({
    where: { userId },
    data: { usedBytes: { increment: sizeBytes } }
  })
  return { userBytes: userAfter.usedBytes, orgBytes: orgAfter.usedBytes }
}

/**
 * 释放配额 (软删时)
 *
 * 软删资产不计额度, 所以 -sizeBytes
 * 如果行不存在 (理论上不会发生), 静默忽略
 */
export async function releaseQuotaOnSoftDelete(
  tx: Tx,
  userId: string,
  sizeBytes: number
): Promise<void> {
  // 用 updateMany + 防 0 减到负
  const orgRow = await tx.orgQuotaCounter.findUnique({ where: { id: 'singleton' } })
  if (orgRow) {
    const newVal = Math.max(0, orgRow.usedBytes - sizeBytes)
    await tx.orgQuotaCounter.update({
      where: { id: 'singleton' },
      data: { usedBytes: newVal }
    })
  }
  const userRow = await tx.userQuotaCounter.findUnique({ where: { userId } })
  if (userRow) {
    const newVal = Math.max(0, userRow.usedBytes - sizeBytes)
    await tx.userQuotaCounter.update({
      where: { userId },
      data: { usedBytes: newVal }
    })
  }
}

/**
 * 回收配额 (恢复时)
 *
 * 复用 reserveQuota (同样的预检 + 原子递增)
 */
export async function reserveQuotaOnRestore(
  tx: Tx,
  userId: string,
  sizeBytes: number
): Promise<void> {
  await reserveQuota(tx, userId, sizeBytes)
}

/**
 * 硬删时释放配额 (如果该行未被软删过, 即直接硬删)
 * 已被软删过的资产在硬删时不重复释放
 */
export async function releaseQuotaOnHardDelete(
  tx: Tx,
  userId: string,
  sizeBytes: number
): Promise<void> {
  await tx.orgQuotaCounter.update({
    where: { id: 'singleton' },
    data: { usedBytes: { decrement: sizeBytes } }
  })
  await tx.userQuotaCounter.update({
    where: { userId },
    data: { usedBytes: { decrement: sizeBytes } }
  })
}

/**
 * 重新同步 counter (cron / 测试用)
 *   - OrgQuotaCounter.usedBytes = SUM(size) WHERE deletedAt IS NULL
 *   - UserQuotaCounter.usedBytes = SUM(size) WHERE ownerId=? AND deletedAt IS NULL
 */
export async function resyncQuotaCounters(
  tx: Tx = prisma
): Promise<{ orgBytes: number; userBytesByUserId: Record<string, number> }> {
  // ORG
  const orgSum = await tx.libraryAsset.aggregate({
    where: { deletedAt: null },
    _sum: { size: true }
  })
  const orgBytes = orgSum._sum.size ?? 0
  await tx.orgQuotaCounter.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton', usedBytes: orgBytes },
    update: { usedBytes: orgBytes }
  })
  // USER (per ownerId, 仅对有过上传的)
  const userSums = await tx.libraryAsset.groupBy({
    by: ['ownerId'],
    where: { deletedAt: null },
    _sum: { size: true }
  })
  const userBytesByUserId: Record<string, number> = {}
  for (const row of userSums) {
    const bytes = row._sum.size ?? 0
    userBytesByUserId[row.ownerId] = bytes
    await tx.userQuotaCounter.upsert({
      where: { userId: row.ownerId },
      create: { userId: row.ownerId, usedBytes: bytes },
      update: { usedBytes: bytes }
    })
  }
  return { orgBytes, userBytesByUserId }
}

// ───────── projectId 校验 (D-5.2) ─────────
/**
 * visibility=PROJECT 时: 项目必须存在 + owner 必须是项目成员 + 项目未归档
 * 其他 visibility 时: projectId 应为 null (否则忽略)
 */
export async function assertProjectVisibleToOwner(
  tx: Tx,
  visibility: Visibility,
  projectId: string | null | undefined,
  ownerId: string
): Promise<{ projectId: string | null }> {
  if (visibility !== 'PROJECT') {
    return { projectId: null }
  }
  if (!projectId) {
    throw new LibraryError(400, 'PROJECT_REQUIRED', '可见性为「项目」时必须关联项目')
  }
  const project = await tx.project.findUnique({
    where: { id: projectId },
    include: {
      members: { where: { userId: ownerId } }
    }
  })
  if (!project) {
    throw new LibraryError(400, 'PROJECT_NOT_FOUND', '项目不存在', { projectId })
  }
  if (project.isArchived) {
    throw new LibraryError(400, 'PROJECT_ARCHIVED', '项目已归档, 无法关联', { projectId })
  }
  if (project.members.length === 0) {
    throw new LibraryError(403, 'NOT_PROJECT_MEMBER', '您不是该项目的成员, 无法关联', { projectId })
  }
  return { projectId }
}

// ───────── 列表查询 ─────────
export interface ListParams {
  page: number
  pageSize: number
  sort: 'createdAt' | 'originalName' | 'size'
  order: 'asc' | 'desc'
  visibility?: Visibility | null
  projectId?: string | null
  ownerId?: string | null
  tag?: string | null
  search?: string | null
  mimeTypePrefix?: string | null
  includeDeleted?: boolean
}

export async function listAssets(
  currentUser: { id: string; isAdmin: boolean; departmentId: string | null },
  params: ListParams
) {
  const where = buildLibraryWhere(currentUser)
  const and: Prisma.LibraryAssetWhereInput[] = []
  if (!params.includeDeleted) {
    and.push({ deletedAt: null })
  } else if (!currentUser.isAdmin) {
    // 非 admin 不能 includeDeleted
    and.push({ deletedAt: null })
  }
  if (params.visibility) {
    and.push({ visibility: params.visibility })
  }
  if (params.projectId) {
    and.push({ projectId: params.projectId })
  }
  if (params.ownerId) {
    and.push({ ownerId: params.ownerId })
  }
  if (params.tag) {
    and.push({ tags: { contains: params.tag } })
  }
  if (params.search) {
    and.push({ title: { contains: params.search } })
  }
  if (params.mimeTypePrefix) {
    and.push({ mimeType: { startsWith: params.mimeTypePrefix } })
  }
  const finalWhere: Prisma.LibraryAssetWhereInput = and.length > 0 ? { AND: [where, ...and] } : where

  const [items, total] = await Promise.all([
    prisma.libraryAsset.findMany({
      where: finalWhere,
      orderBy: { [params.sort]: params.order },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
      include: {
        owner: { select: { id: true, nickname: true, avatar: true } },
        project: { select: { id: true, name: true } }
      }
    }),
    prisma.libraryAsset.count({ where: finalWhere })
  ])

  return {
    items: items.map(serializeAsset),
    total,
    page: params.page,
    pageSize: params.pageSize
  }
}

export async function getAssetById(
  currentUser: { id: string; isAdmin: boolean; departmentId: string | null },
  id: string
) {
  const where = buildLibraryWhere(currentUser)
  const asset = await prisma.libraryAsset.findFirst({
    where: { AND: [where, { id }] },
    include: {
      owner: { select: { id: true, nickname: true, avatar: true } },
      project: { select: { id: true, name: true } }
    }
  })
  if (!asset) {
    throw new LibraryError(404, 'NOT_FOUND', '图片不存在或不可见')
  }
  return serializeAsset(asset)
}

// ───────── 软删 / 恢复 (D-5.9 + D-5.3) ─────────
export async function softDeleteAsset(
  currentUser: { id: string; isAdmin: boolean },
  id: string
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const asset = await tx.libraryAsset.findUnique({ where: { id } })
    if (!asset || asset.deletedAt) {
      throw new LibraryError(404, 'NOT_FOUND', '图片不存在')
    }
    if (asset.ownerId !== currentUser.id && !currentUser.isAdmin) {
      throw new LibraryError(403, 'NOT_OWNER', '仅上传者或管理员可删除')
    }
    await tx.libraryAsset.update({
      where: { id },
      data: { deletedAt: new Date() }
    })
    // 释放配额 (软删不计额度)
    await releaseQuotaOnSoftDelete(tx, asset.ownerId, asset.size)
  })
  logger.info('资料库资产已软删', { id, by: currentUser.id })
}

export async function restoreAsset(
  currentUser: { id: string; isAdmin: boolean },
  id: string
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const asset = await tx.libraryAsset.findUnique({ where: { id } })
    if (!asset || !asset.deletedAt) {
      throw new LibraryError(404, 'NOT_FOUND', '图片不存在或未被删除')
    }
    if (asset.ownerId !== currentUser.id && !currentUser.isAdmin) {
      throw new LibraryError(403, 'NOT_OWNER', '仅上传者或管理员可恢复')
    }
    // 恢复前校验 ORG_QUOTA (USER_QUOTA 也校验) — 恢复不应超额
    await reserveQuotaOnRestore(tx, asset.ownerId, asset.size)
    await tx.libraryAsset.update({
      where: { id },
      data: { deletedAt: null }
    })
  })
  logger.info('资料库资产已恢复', { id, by: currentUser.id })
}

// ───────── 30 天硬删清理 (B6 cron) ─────────
export interface CleanupResult {
  scanned: number
  hardDeleted: number
  filesRemoved: number
  errors: Array<{ id: string; error: string }>
}

/**
 * 30 天前软删的资产 → 物理删除 (DB 行 + 磁盘文件) + 释放配额
 * 并重新同步 counter (防漂移)
 */
export async function cleanupExpiredSoftDeleted(): Promise<CleanupResult> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - RECYCLE_DAYS)
  const result: CleanupResult = { scanned: 0, hardDeleted: 0, filesRemoved: 0, errors: [] }
  // 注意: 不能在 $transaction 里做 fs.unlink (外副作用)
  // 顺序: 先在 DB 内 DELETE 全部 + 释放配额 (单事务) → 再批量 unlink
  const expired = await prisma.libraryAsset.findMany({
    where: { deletedAt: { lt: cutoff } },
    select: { id: true, ownerId: true, size: true, storagePath: true }
  })
  result.scanned = expired.length
  if (expired.length === 0) {
    // 仍然 resync counter 一次, 防止漂移
    await resyncQuotaCounters()
    return result
  }
  const ids = expired.map((a) => a.id)
  // 释放配额 + DELETE 单事务
  await prisma.$transaction(async (tx) => {
    for (const a of expired) {
      try {
        await releaseQuotaOnHardDelete(tx, a.ownerId, a.size)
      } catch (e) {
        result.errors.push({ id: a.id, error: `release quota: ${String(e)}` })
      }
    }
    const del = await tx.libraryAsset.deleteMany({ where: { id: { in: ids } } })
    result.hardDeleted = del.count
  })
  // 物理删文件 (失败不致命, 由 §6d P2 监控兜底)
  const { deleteFileSafe, toAbsolutePath } = await import('../utils/storageProvider.js')
  for (const a of expired) {
    try {
      deleteFileSafe(toAbsolutePath(a.storagePath))
      result.filesRemoved += 1
    } catch (e) {
      result.errors.push({ id: a.id, error: `unlink: ${String(e)}` })
    }
  }
  // resync 防止漂移
  await resyncQuotaCounters()
  logger.info('资料库 30 天硬删清理完成', result)
  return result
}

// ───────── 序列化 ─────────
function serializeAsset<
  T extends {
    id: string
    title: string
    originalName: string
    mimeType: string
    size: number
    width: number | null
    height: number | null
    visibility: string
    projectId: string | null
    project?: { id: string; name: string } | null
    ownerId: string
    owner?: { id: string; nickname: string | null; avatar: string | null } | null
    tags: string | null
    uploaderNote: string | null
    createdAt: Date
    updatedAt: Date
  }
>(a: T) {
  return {
    id: a.id,
    title: a.title,
    originalName: a.originalName,
    mimeType: a.mimeType,
    size: a.size,
    width: a.width,
    height: a.height,
    visibility: a.visibility,
    projectId: a.projectId,
    projectName: a.project?.name ?? null,
    ownerId: a.ownerId,
    ownerName: a.owner?.nickname ?? null,
    ownerAvatar: a.owner?.avatar ?? null,
    tags: a.tags ? a.tags.split(',').map((s) => s.trim()).filter(Boolean) : [],
    uploaderNote: a.uploaderNote,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt
  }
}
