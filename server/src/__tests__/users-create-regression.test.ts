/**
 * 中集智历 - /api/users/create 500 修复回归锁
 *
 * 背景(2026-06-25 P1 HOTFIX):
 *   生产环境 /api/users/create 在异常分支(权限拒绝 / 重复邮箱 / 部门不存在 /
 *   数据库写入异常)出现 500 + 结构化错误响应丢失。
 *
 * 本测试文件作为「修复后」回归锁:
 *   - 任何「业务预期错误」必须返回结构化 JSON 响应
 *   - 不允许出现「未捕获异常 → 默认 500 HTML」或「空响应体」
 *   - status code 必须是业务语义正确值(400 / 401 / 403),不允许 500
 *   - 响应 Content-Type 必须是 application/json
 *
 * 覆盖矩阵:
 *   正常路径   — 管理员创建用户 → 201 + 新用户数据
 *   权限拒绝   — 非管理员 / 无 token / 过期 token
 *   业务校验   — 缺字段 / 短密码 / 重复邮箱 / 非法部门
 *   错误契约锁 — 所有错误响应 JSON + success:false + message 非空
 */
import request from 'supertest'
import prisma from '../config/database.js'
import app from '../app.js'

// ============== 测试数据 ==============

const adminUser = {
  email: 'users-create-admin@example.com',
  password: 'AdminPass123',
  nickname: 'Users Create Admin',
  securityQuestion: 0,
  securityAnswer: 'Answer'
}

const memberUser = {
  email: 'users-create-member@example.com',
  password: 'MemberPass123',
  nickname: 'Users Create Member',
  securityQuestion: 0,
  securityAnswer: 'Answer'
}

const newUserPayload = {
  email: 'users-create-newbie@example.com',
  password: 'NewbiePass123',
  nickname: 'Newbie'
}

const duplicateEmailPayload = {
  email: 'users-create-dup@example.com',
  password: 'DupPass123',
  nickname: 'Dup1'
}

// ============== 工具函数:断言错误响应契约 ==============

/**
 * 验证响应是「结构化 JSON 错误」,不是 HTML/空/裸 500
 * — 这就是 500 修复回归锁的核心断言
 */
function expectStructuredError(res: request.Response, allowedStatuses: number[]) {
  // 1. status 必须在白名单(不允许 500)
  expect(allowedStatuses).toContain(res.status)
  expect(res.status).not.toBe(500)

  // 2. Content-Type 必须是 JSON(不是 text/html)
  const ct = res.headers['content-type'] || ''
  expect(ct).toMatch(/application\/json/)

  // 3. body 必须是可解析的 JSON 对象
  expect(typeof res.body).toBe('object')
  expect(res.body).not.toBe(null)

  // 4. 必须有 success: false
  expect(res.body).toHaveProperty('success')
  expect(res.body.success).toBe(false)

  // 5. 必须有非空 message(不能是 undefined / 空串)
  expect(res.body).toHaveProperty('message')
  expect(typeof res.body.message).toBe('string')
  expect(res.body.message.length).toBeGreaterThan(0)
}

// ============== 测试套件 ==============

describe('P1 回归锁 — POST /api/users/create', () => {
  let adminToken: string
  let memberToken: string

  beforeAll(async () => {
    // 清理
    await prisma.securityAnswer.deleteMany({
      where: {
        user: {
          email: {
            in: [adminUser.email, memberUser.email, newUserPayload.email, duplicateEmailPayload.email]
          }
        }
      }
    })
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [adminUser.email, memberUser.email, newUserPayload.email, duplicateEmailPayload.email]
        }
      }
    })

    // 注册管理员 + 升级为系统管理员
    const adminReg = await request(app).post('/api/auth/register').send(adminUser)
    const adminId = adminReg.body.data.user.id
    await prisma.user.update({ where: { id: adminId }, data: { isAdmin: true } })
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: adminUser.email, password: adminUser.password })
    adminToken = adminLogin.body.data.token

    // 注册普通成员
    await request(app).post('/api/auth/register').send(memberUser)
    const memberLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: memberUser.email, password: memberUser.password })
    memberToken = memberLogin.body.data.token
  })

  afterAll(async () => {
    await prisma.securityAnswer.deleteMany({
      where: {
        user: {
          email: {
            in: [adminUser.email, memberUser.email, newUserPayload.email, duplicateEmailPayload.email]
          }
        }
      }
    })
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [adminUser.email, memberUser.email, newUserPayload.email, duplicateEmailPayload.email]
        }
      }
    })
    await prisma.$disconnect()
  })

  // --------------- 正常路径 ---------------

  describe('正常路径', () => {
    it('管理员创建新用户 → 201 + 新用户数据', async () => {
      const res = await request(app)
        .post('/api/users/create')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newUserPayload)
        .expect(201)

      expect(res.body.success).toBe(true)
      expect(res.body.data).toHaveProperty('id')
      expect(res.body.data.email).toBe(newUserPayload.email)
      expect(res.body.data.nickname).toBe(newUserPayload.nickname)
      expect(res.body.data).not.toHaveProperty('password')
    })

    it('管理员创建不带 nickname 的用户 → 不允许返回 500 (Prisma NOT NULL 触发过的回归路径)', async () => {
      // 历史回归:之前 createUser 写 `nickname: nickname || null`,但 Prisma schema
      // 要求 nickname NOT NULL,无 nickname 时直接抛 PrismaClientValidationError,
      // 落入 errorHandler 默认 500 分支(并泄露 Prisma 错误栈)。
      // 本测试作为回归锁:此路径不允许 500,要么 201 成功(修复后),要么
      // 400 显式校验失败(明确告知调用方缺字段)。两种走向都是正确契约。
      const res = await request(app)
        .post('/api/users/create')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'users-create-nono@example.com',
          password: 'NoNickPass123'
        })

      // 不允许 500
      expect(res.status).not.toBe(500)
      expect(res.headers['content-type']).toMatch(/application\/json/)

      // 必须是 201 或 400
      expect([201, 400]).toContain(res.status)

      if (res.status === 201) {
        // 修复后允许创建,只断言响应结构
        expect(res.body.success).toBe(true)
        expect(res.body.data.email).toBe('users-create-nono@example.com')
        expect(res.body.data).not.toHaveProperty('password')
        // 清理
        await prisma.user.delete({ where: { email: 'users-create-nono@example.com' } })
      } else {
        // 400 路径同样满足结构化契约
        expectStructuredError(res, [400])
      }
    })
  })

  // --------------- 权限拒绝(不允许 500) ---------------

  describe('权限拒绝', () => {
    it('非管理员(MEMBER)调用 → 403 结构化 JSON', async () => {
      const res = await request(app)
        .post('/api/users/create')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ email: 'should-not-create@example.com', password: 'ShouldPass123' })

      expectStructuredError(res, [403])
      expect(res.body.message).toMatch(/管理员|权限/)
    })

    it('无 Authorization 头 → 401 结构化 JSON', async () => {
      const res = await request(app)
        .post('/api/users/create')
        .send(newUserPayload)

      expectStructuredError(res, [401])
    })

    it('Bearer 但无 token → 401 结构化 JSON', async () => {
      const res = await request(app)
        .post('/api/users/create')
        .set('Authorization', 'Bearer ')
        .send(newUserPayload)

      expectStructuredError(res, [401])
    })

    it('无效 token → 401 结构化 JSON', async () => {
      const res = await request(app)
        .post('/api/users/create')
        .set('Authorization', 'Bearer invalid.token.here')
        .send(newUserPayload)

      expectStructuredError(res, [401])
    })
  })

  // --------------- 业务校验边界(不允许 500) ---------------

  describe('业务校验边界', () => {
    it('缺 email → 400 结构化 JSON', async () => {
      const res = await request(app)
        .post('/api/users/create')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ password: 'ValidPass123' })

      expectStructuredError(res, [400])
    })

    it('缺 password → 400 结构化 JSON', async () => {
      const res = await request(app)
        .post('/api/users/create')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'no-password@example.com' })

      expectStructuredError(res, [400])
    })

    it('密码 < 6 位 → 400 结构化 JSON', async () => {
      const res = await request(app)
        .post('/api/users/create')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'short-pw@example.com', password: '12345' })

      expectStructuredError(res, [400])
      expect(res.body.message).toMatch(/密码/)
    })

    it('重复 email → 400 结构化 JSON', async () => {
      // 先创建一个
      await request(app)
        .post('/api/users/create')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(duplicateEmailPayload)
        .expect(201)

      // 再用相同 email
      const res = await request(app)
        .post('/api/users/create')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(duplicateEmailPayload)

      expectStructuredError(res, [400])
      expect(res.body.message).toMatch(/邮箱|注册/)
    })

    it('email 为空字符串 → 400 结构化 JSON', async () => {
      const res = await request(app)
        .post('/api/users/create')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: '', password: 'ValidPass123' })

      expectStructuredError(res, [400])
    })

    it('password 为空字符串 → 400 结构化 JSON', async () => {
      const res = await request(app)
        .post('/api/users/create')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'empty-pw@example.com', password: '' })

      expectStructuredError(res, [400])
    })

    it('空 body → 400 结构化 JSON', async () => {
      const res = await request(app)
        .post('/api/users/create')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})

      expectStructuredError(res, [400])
    })

    it('departmentId 不存在 → 400 结构化 JSON', async () => {
      const res = await request(app)
        .post('/api/users/create')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'no-dept@example.com',
          password: 'ValidPass123',
          departmentId: 'non-existent-department-id-xxxxx'
        })

      expectStructuredError(res, [400])
      expect(res.body.message).toMatch(/部门/)
    })
  })

  // --------------- 错误契约回归锁(核心断言) ---------------

  describe('错误契约锁 — 所有错误响应必须结构化', () => {
    /**
     * 此用例是回归锁的核心:不管错误路径如何变化,
     * 响应必须满足:
     *   1. status ∈ {400, 401, 403},绝不是 500
     *   2. Content-Type: application/json
     *   3. body.success === false
     *   4. body.message 是非空字符串
     *
     * 一旦未来重构破坏该契约,这条 it 用例会失败并定位到问题。
     */
    const errorProbes: Array<{
      label: string
      payload: unknown
      auth?: string
      allowed: number[]
    }> = [
      { label: '无 token + 有效 body', payload: { email: 'x@x.com', password: 'ValidPass123' }, allowed: [401] },
      { label: 'MEMBER + 有效 body', payload: { email: 'x@x.com', password: 'ValidPass123' }, auth: 'member', allowed: [403] },
      { label: 'ADMIN + 空 body', payload: {}, auth: 'admin', allowed: [400] },
      { label: 'ADMIN + 缺 email', payload: { password: 'ValidPass123' }, auth: 'admin', allowed: [400] },
      { label: 'ADMIN + 缺 password', payload: { email: 'x@x.com' }, auth: 'admin', allowed: [400] },
      { label: 'ADMIN + 短密码', payload: { email: 'short@x.com', password: '123' }, auth: 'admin', allowed: [400] },
      { label: 'ADMIN + 空 email', payload: { email: '', password: 'ValidPass123' }, auth: 'admin', allowed: [400] },
      { label: 'ADMIN + 空 password', payload: { email: 'x@x.com', password: '' }, auth: 'admin', allowed: [400] },
      { label: 'ADMIN + 非法 departmentId', payload: { email: 'no-dept-probe@x.com', password: 'ValidPass123', departmentId: 'bad-id-xxxx' }, auth: 'admin', allowed: [400] }
    ]

    for (const probe of errorProbes) {
      it(`${probe.label} → ${probe.allowed.join('/')} + 结构化 JSON (非 500)`, async () => {
        const req = request(app).post('/api/users/create')
        if (probe.auth === 'admin') {
          req.set('Authorization', `Bearer ${adminToken}`)
        } else if (probe.auth === 'member') {
          req.set('Authorization', `Bearer ${memberToken}`)
        }
        const res = await req.send(probe.payload as object)

        expectStructuredError(res, probe.allowed)
      })
    }
  })
})