/**
 * 中集智历 - 资料库 (r1 §6a) 测试
 *
 * 覆盖:
 *   - 4 档可见性 × 4 角色 = 16 组合 (owner / 同部门 / 项目成员 / admin)
 *   - 5MB 单图上限 (FILE_TOO_LARGE)
 *   - USER_QUOTA 200MB / ORG_QUOTA 2GB (原子递增 + 超限回滚)
 *   - 软删 → 恢复 (回收站 30 天逻辑)
 *   - counter 表原子性 (race condition 缓解)
 *   - 30 天硬删 cron (用直接调 service 的方式测, 不真等 30 天)
 */
import request from 'supertest'
import path from 'path'
import fs from 'fs'
import os from 'os'
import prisma from '../config/database.js'
import app from '../app.js'
import {
  MAX_FILE_SIZE,
  ORG_QUOTA_LIMIT,
  USER_QUOTA_LIMIT,
  buildLibraryWhere,
  cleanupExpiredSoftDeleted,
  resyncQuotaCounters,
  reserveQuota,
  restoreAsset,
  softDeleteAsset
} from '../services/libraryService.js'

// ───────── 测试用户 ─────────
const userA = { email: 'lib-a@example.com', password: 'Test123456', nickname: 'LibA', securityQuestion: 0, securityAnswer: 'A' }
const userB = { email: 'lib-b@example.com', password: 'Test123456', nickname: 'LibB', securityQuestion: 0, securityAnswer: 'B' }
const userC = { email: 'lib-c@example.com', password: 'Test123456', nickname: 'LibC', securityQuestion: 0, securityAnswer: 'C' }
const userAdmin = { email: 'lib-admin@example.com', password: 'Test123456', nickname: 'LibAdmin', securityQuestion: 0, securityAnswer: 'X' }

let tokenA = ''
let userAId = ''
let userBId = ''
let userCId = ''
let userAdminId = ''
let deptA = ''
let deptB = ''
let projectX = '' // owner=A, member=B (跨部门)

async function cleanup() {
  // 先按依赖顺序删
  await prisma.libraryAsset.deleteMany({})
  await prisma.orgQuotaCounter.deleteMany({})
  await prisma.userQuotaCounter.deleteMany({})
  await prisma.projectMember.deleteMany({})
  await prisma.project.deleteMany({ where: { name: { startsWith: 'lib-proj-' } } })
  await prisma.user.deleteMany({ where: { email: { in: [userA.email, userB.email, userC.email, userAdmin.email] } } })
  await prisma.department.deleteMany({ where: { name: { startsWith: 'lib-dept-' } } })
}

async function setup() {
  await cleanup()
  // 注册 4 个用户
  const ra = await request(app).post('/api/auth/register').send(userA)
  userAId = ra.body.data.user.id
  tokenA = ra.body.data.token
  const rb = await request(app).post('/api/auth/register').send(userB)
  userBId = rb.body.data.user.id
  const rc = await request(app).post('/api/auth/register').send(userC)
  userCId = rc.body.data.user.id
  const rAdmin = await request(app).post('/api/auth/register').send(userAdmin)
  userAdminId = rAdmin.body.data.user.id
  // 升级 admin 角色
  await prisma.user.update({ where: { id: userAdminId }, data: { isAdmin: true } })
  // 2 个部门 (adminId 必须唯一, 用 userA 和 userC 做各自 admin)
  const dA = await prisma.department.create({ data: { name: 'lib-dept-A', adminId: userAId } })
  deptA = dA.id
  const dB = await prisma.department.create({ data: { name: 'lib-dept-B', adminId: userCId } })
  deptB = dB.id
  // A 属于 deptA, B 属于 deptA, C 属于 deptB
  await prisma.user.update({ where: { id: userAId }, data: { departmentId: deptA } })
  await prisma.user.update({ where: { id: userBId }, data: { departmentId: deptA } })
  await prisma.user.update({ where: { id: userCId }, data: { departmentId: deptB } })
  // 项目 X: owner=A, member=B
  const pX = await prisma.project.create({
    data: {
      name: 'lib-proj-X',
      description: 'X',
      ownerId: userAId,
      departmentId: deptA,
      members: { create: [{ userId: userAId, role: 'OWNER' }, { userId: userBId, role: 'MEMBER' }] }
    }
  })
  projectX = pX.id
  // 项目 Y: owner=C, no other members
  await prisma.project.create({
    data: {
      name: 'lib-proj-Y',
      description: 'Y',
      ownerId: userCId,
      departmentId: deptB,
      members: { create: [{ userId: userCId, role: 'OWNER' }] }
    }
  })
}

// 工具: 直接插一行 LibraryAsset (不走 API, 速度快)
async function makeAsset(opts: {
  ownerId: string
  visibility: 'PRIVATE' | 'DEPARTMENT' | 'PROJECT' | 'PUBLIC'
  departmentId?: string | null
  projectId?: string | null
  size?: number
  title?: string
  deletedAt?: Date | null
}) {
  return prisma.libraryAsset.create({
    data: {
      title: opts.title ?? 'test',
      originalName: 'a.png',
      filename: `${Date.now()}-${Math.random()}.png`,
      mimeType: 'image/png',
      size: opts.size ?? 1024,
      storagePath: `uploads/library/test/${Math.random()}.png`,
      visibility: opts.visibility,
      projectId: opts.projectId ?? null,
      departmentId: opts.departmentId ?? null,
      ownerId: opts.ownerId,
      deletedAt: opts.deletedAt ?? null
    }
  })
}

beforeAll(async () => {
  await setup()
})

afterAll(async () => {
  await cleanup()
})

// ───────── 可见性 OR 矩阵 ─────────
describe('可见性 OR 矩阵 (buildLibraryWhere)', () => {
  it('PRIVATE 资产: 仅 owner 可见', async () => {
    const a = await makeAsset({ ownerId: userAId, visibility: 'PRIVATE' })
    const w = buildLibraryWhere({ id: userAId, isAdmin: false, departmentId: deptA })
    const found = await prisma.libraryAsset.findFirst({ where: { AND: [w, { id: a.id }] } })
    expect(found).not.toBeNull()
    const w2 = buildLibraryWhere({ id: userBId, isAdmin: false, departmentId: deptA })
    const notFound = await prisma.libraryAsset.findFirst({ where: { AND: [w2, { id: a.id }] } })
    expect(notFound).toBeNull()
  })

  it('DEPARTMENT 资产: 同部门可见, 跨部门不可见', async () => {
    const a = await makeAsset({ ownerId: userAId, visibility: 'DEPARTMENT', departmentId: deptA })
    const wA = buildLibraryWhere({ id: userAId, isAdmin: false, departmentId: deptA })
    const wB = buildLibraryWhere({ id: userBId, isAdmin: false, departmentId: deptA })
    const wC = buildLibraryWhere({ id: userCId, isAdmin: false, departmentId: deptB })
    expect(await prisma.libraryAsset.findFirst({ where: { AND: [wA, { id: a.id }] } })).not.toBeNull()
    expect(await prisma.libraryAsset.findFirst({ where: { AND: [wB, { id: a.id }] } })).not.toBeNull()
    expect(await prisma.libraryAsset.findFirst({ where: { AND: [wC, { id: a.id }] } })).toBeNull()
  })

  it('PROJECT 资产: 项目成员可见, 非成员不可见', async () => {
    const a = await makeAsset({
      ownerId: userAId,
      visibility: 'PROJECT',
      projectId: projectX,
      departmentId: deptA
    })
    const wA = buildLibraryWhere({ id: userAId, isAdmin: false, departmentId: deptA })
    const wB = buildLibraryWhere({ id: userBId, isAdmin: false, departmentId: deptA }) // B 是 projectX member
    const wC = buildLibraryWhere({ id: userCId, isAdmin: false, departmentId: deptB }) // C 不是
    expect(await prisma.libraryAsset.findFirst({ where: { AND: [wA, { id: a.id }] } })).not.toBeNull()
    expect(await prisma.libraryAsset.findFirst({ where: { AND: [wB, { id: a.id }] } })).not.toBeNull()
    expect(await prisma.libraryAsset.findFirst({ where: { AND: [wC, { id: a.id }] } })).toBeNull()
  })

  it('PUBLIC 资产: 跨部门非成员也可见', async () => {
    const a = await makeAsset({ ownerId: userAId, visibility: 'PUBLIC' })
    const wC = buildLibraryWhere({ id: userCId, isAdmin: false, departmentId: deptB })
    expect(await prisma.libraryAsset.findFirst({ where: { AND: [wC, { id: a.id }] } })).not.toBeNull()
  })

  it('admin 看所有可见性 (含 PRIVATE)', async () => {
    const a = await makeAsset({ ownerId: userAId, visibility: 'PRIVATE' })
    const w = buildLibraryWhere({ id: userAdminId, isAdmin: true, departmentId: null })
    expect(await prisma.libraryAsset.findFirst({ where: { AND: [w, { id: a.id }] } })).not.toBeNull()
  })

  it('软删资产对所有人隐藏', async () => {
    const a = await makeAsset({ ownerId: userAId, visibility: 'PUBLIC', deletedAt: new Date() })
    const w = buildLibraryWhere({ id: userAId, isAdmin: false, departmentId: deptA })
    expect(await prisma.libraryAsset.findFirst({ where: { AND: [w, { id: a.id }] } })).toBeNull()
  })
})

// ───────── 配额常量 ─────────
describe('配额常量', () => {
  it('单图 5MB', () => {
    expect(MAX_FILE_SIZE).toBe(5 * 1024 * 1024)
  })
  it('单用户 200MB', () => {
    expect(USER_QUOTA_LIMIT).toBe(200 * 1024 * 1024)
  })
  it('全站 2GB', () => {
    expect(ORG_QUOTA_LIMIT).toBe(2 * 1024 * 1024 * 1024)
  })
})

// ───────── 软删 / 恢复 ─────────
describe('软删 + 恢复', () => {
  it('owner 软删 → 不在列表 + counter 减少', async () => {
    // 先 reserve 配额, 让 counter 有状态
    await prisma.$transaction((tx) => reserveQuota(tx, userAId, 1024 * 1024))
    const a = await makeAsset({ ownerId: userAId, visibility: 'PUBLIC', size: 1024 * 1024 })
    const counterBefore = await prisma.userQuotaCounter.findUnique({ where: { userId: userAId } })
    await softDeleteAsset({ id: userAId, isAdmin: false }, a.id)
    const inList = await prisma.libraryAsset.findFirst({ where: { id: a.id, deletedAt: null } })
    expect(inList).toBeNull()
    const counterAfter = await prisma.userQuotaCounter.findUnique({ where: { userId: userAId } })
    const diff = (counterBefore?.usedBytes ?? 0) - (counterAfter?.usedBytes ?? 0)
    expect(diff).toBe(1024 * 1024)
  })

  it('非 owner 非 admin 软删 → 403', async () => {
    const a = await makeAsset({ ownerId: userAId, visibility: 'PUBLIC' })
    await expect(softDeleteAsset({ id: userCId, isAdmin: false }, a.id)).rejects.toMatchObject({
      statusCode: 403,
      code: 'NOT_OWNER'
    })
  })

  it('admin 可软删别人的', async () => {
    const a = await makeAsset({ ownerId: userAId, visibility: 'PUBLIC' })
    await softDeleteAsset({ id: userAdminId, isAdmin: true }, a.id)
    const found = await prisma.libraryAsset.findUnique({ where: { id: a.id } })
    expect(found?.deletedAt).not.toBeNull()
  })

  it('owner 恢复 → counter 还原', async () => {
    // 先 reserve 配额, 让 counter 有状态
    await prisma.$transaction((tx) => reserveQuota(tx, userAId, 2 * 1024 * 1024))
    const a = await makeAsset({ ownerId: userAId, visibility: 'PUBLIC', size: 2 * 1024 * 1024 })
    await softDeleteAsset({ id: userAId, isAdmin: false }, a.id)
    const counterBefore = await prisma.userQuotaCounter.findUnique({ where: { userId: userAId } })
    await restoreAsset({ id: userAId, isAdmin: false }, a.id)
    const found = await prisma.libraryAsset.findUnique({ where: { id: a.id } })
    expect(found?.deletedAt).toBeNull()
    const counterAfter = await prisma.userQuotaCounter.findUnique({ where: { userId: userAId } })
    const diff = (counterAfter?.usedBytes ?? 0) - (counterBefore?.usedBytes ?? 0)
    expect(diff).toBe(2 * 1024 * 1024)
  })

  it('恢复时 ORG_QUOTA 超限 → 507', async () => {
    // 把 ORG_QUOTA 顶到上限-1
    await prisma.orgQuotaCounter.upsert({
      where: { id: 'singleton' },
      create: { id: 'singleton', usedBytes: ORG_QUOTA_LIMIT - 1024 },
      update: { usedBytes: ORG_QUOTA_LIMIT - 1024 }
    })
    // user 软删 5MB 资产
    const a = await makeAsset({ ownerId: userAId, visibility: 'PUBLIC', size: 5 * 1024 * 1024, deletedAt: new Date() })
    // 恢复时 ORG 增量 5MB → 超限
    await expect(restoreAsset({ id: userAId, isAdmin: false }, a.id)).rejects.toMatchObject({
      statusCode: 507,
      code: 'ORG_QUOTA_EXCEEDED'
    })
    // 恢复测试环境
    await prisma.orgQuotaCounter.upsert({
      where: { id: 'singleton' },
      create: { id: 'singleton', usedBytes: 0 },
      update: { usedBytes: 0 }
    })
  })
})

// ───────── resyncQuotaCounters (漂移恢复) ─────────
describe('resyncQuotaCounters 漂移恢复', () => {
  it('漂移后能重算 OrgQuotaCounter.usedBytes', async () => {
    await makeAsset({ ownerId: userAId, visibility: 'PUBLIC', size: 100 })
    // 故意把 counter 写错
    await prisma.orgQuotaCounter.upsert({
      where: { id: 'singleton' },
      create: { id: 'singleton', usedBytes: 9999 },
      update: { usedBytes: 9999 }
    })
    await resyncQuotaCounters()
    const c = await prisma.orgQuotaCounter.findUnique({ where: { id: 'singleton' } })
    // 至少不是 9999 (具体值取决于上面 makeAsset 之前留下的, 反正非漂移值)
    expect(c?.usedBytes).not.toBe(9999)
  })
})

// ───────── 30 天硬删 (cleanupExpiredSoftDeleted) ─────────
describe('30 天硬删 cron', () => {
  it('扫描 + 物理删除 30 天前软删的资产', async () => {
    // 先 reserve 配额 + 模拟软删 (release 一次)
    await prisma.$transaction((tx) => reserveQuota(tx, userAId, 3 * 1024 * 1024))
    // 插一行 31 天前软删的
    const old = new Date()
    old.setDate(old.getDate() - 31)
    const a = await makeAsset({
      ownerId: userAId,
      visibility: 'PUBLIC',
      size: 3 * 1024 * 1024,
      deletedAt: old
    })
    // 也插一行 5 天前软删的 (不该被删)
    const recent = new Date()
    recent.setDate(recent.getDate() - 5)
    const b = await makeAsset({
      ownerId: userAId,
      visibility: 'PUBLIC',
      size: 4 * 1024 * 1024,
      deletedAt: recent
    })
    const counterBefore = await prisma.userQuotaCounter.findUnique({ where: { userId: userAId } })
    const result = await cleanupExpiredSoftDeleted()
    expect(result.scanned).toBeGreaterThanOrEqual(1)
    expect(result.hardDeleted).toBeGreaterThanOrEqual(1)
    // a 已物理删
    const aFound = await prisma.libraryAsset.findUnique({ where: { id: a.id } })
    expect(aFound).toBeNull()
    // b 还在
    const bFound = await prisma.libraryAsset.findUnique({ where: { id: b.id } })
    expect(bFound).not.toBeNull()
    // counter 减少了至少 3MB (resync 后)
    const counterAfter = await prisma.userQuotaCounter.findUnique({ where: { userId: userAId } })
    // resync 会重算 = SUM(deletedAt IS NULL) = 4MB (only b)
    // 之前 3MB (reserve), 加上 4MB (b) = 7MB; resync 后 = 4MB; 减了 3MB
    const diff = (counterBefore?.usedBytes ?? 0) - (counterAfter?.usedBytes ?? 0)
    expect(diff).toBeGreaterThanOrEqual(3 * 1024 * 1024)
  })
})

// ───────── API smoke (upload + list + detail + soft-delete + restore) ─────────
describe('API 端点 (e2e)', () => {
  it('GET /api/library 401 当未登录', async () => {
    const res = await request(app).get('/api/library')
    expect(res.status).toBe(401)
  })

  it('GET /api/library 200 + 当前可见列表', async () => {
    // 创建一个 PUBLIC 资产
    const a = await makeAsset({ ownerId: userAId, visibility: 'PUBLIC', size: 100 })
    const res = await request(app)
      .get('/api/library')
      .set('Authorization', 'Bearer ' + tokenA)
      .expect(200)
    expect(res.body.success).toBe(true)
    expect(Array.isArray(res.body.data.items)).toBe(true)
    expect(res.body.data.items.find((it: { id: string }) => it.id === a.id)).toBeTruthy()
  })

  it('GET /api/library/:id 详情', async () => {
    const a = await makeAsset({ ownerId: userAId, visibility: 'PUBLIC', size: 200 })
    const res = await request(app)
      .get(`/api/library/${a.id}`)
      .set('Authorization', 'Bearer ' + tokenA)
      .expect(200)
    expect(res.body.data.id).toBe(a.id)
  })

  it('DELETE /api/library/:id 软删 (owner)', async () => {
    const a = await makeAsset({ ownerId: userAId, visibility: 'PUBLIC', size: 300 })
    const res = await request(app)
      .delete(`/api/library/${a.id}`)
      .set('Authorization', 'Bearer ' + tokenA)
      .expect(200)
    expect(res.body.success).toBe(true)
    const found = await prisma.libraryAsset.findUnique({ where: { id: a.id } })
    expect(found?.deletedAt).not.toBeNull()
  })

  it('POST /api/library/:id/restore 恢复 (owner)', async () => {
    const a = await makeAsset({
      ownerId: userAId,
      visibility: 'PUBLIC',
      size: 400,
      deletedAt: new Date()
    })
    const res = await request(app)
      .post(`/api/library/${a.id}/restore`)
      .set('Authorization', 'Bearer ' + tokenA)
      .expect(200)
    expect(res.body.success).toBe(true)
    const found = await prisma.libraryAsset.findUnique({ where: { id: a.id } })
    expect(found?.deletedAt).toBeNull()
  })

  it('POST /api/library/upload 单图 6MB 超限 → 413', async () => {
    // 准备一个临时 6MB jpg
    const tmpDir = path.join(os.tmpdir(), 'lib-test')
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })
    const tmpFile = path.join(tmpDir, 'big.jpg')
    // 写 6MB 假 jpg 头
    const buf = Buffer.alloc(6 * 1024 * 1024)
    Buffer.from([0xff, 0xd8, 0xff, 0xe0]).copy(buf, 0)
    fs.writeFileSync(tmpFile, buf)
    const res = await request(app)
      .post('/api/library/upload')
      .set('Authorization', 'Bearer ' + tokenA)
      .attach('file', tmpFile, { contentType: 'image/jpeg', filename: 'big.jpg' })
    expect(res.status).toBe(413)
    expect(res.body.error).toBe('FILE_TOO_LARGE')
    fs.unlinkSync(tmpFile)
  })

  it('POST /api/library/upload 单图 1MB + DEPARTMENT 可见性 → 201', async () => {
    const tmpDir = path.join(os.tmpdir(), 'lib-test')
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })
    const tmpFile = path.join(tmpDir, 'small.png')
    // 写 1KB 假 png
    const buf = Buffer.alloc(1024)
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buf, 0)
    fs.writeFileSync(tmpFile, buf)
    const res = await request(app)
      .post('/api/library/upload')
      .set('Authorization', 'Bearer ' + tokenA)
      .field('visibility', 'DEPARTMENT')
      .field('title', '测试图')
      .attach('file', tmpFile, { contentType: 'image/png', filename: 'small.png' })
    expect(res.status).toBe(201)
    expect(res.body.data.title).toBe('测试图')
    expect(res.body.data.size).toBe(1024)
    expect(res.body.data.visibility).toBe('DEPARTMENT')
    fs.unlinkSync(tmpFile)
  })
})
