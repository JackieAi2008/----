/**
 * 中集智历 - /api/auth/login 500 修复回归锁
 *
 * 背景(2026-06-25 P1 HOTFIX):
 *   生产环境 /api/auth/login 在异常分支(认证失败 / 输入校验失败 / 数据库异常)
 *   出现 500 + 结构化错误响应丢失。根因:errorHandler 未稳定捕获 async throw。
 *
 * 本测试文件作为「修复后」回归锁:
 *   - 任何「业务预期错误」必须返回结构化 JSON 响应
 *   - 不允许出现「未捕获异常 → 默认 500 HTML」或「空响应体」
 *   - status code 必须是业务语义正确值(400 / 401 / 403),不允许 500
 *   - 响应 Content-Type 必须是 application/json
 *
 * 覆盖矩阵:
 *   正常路径   — 正确账号 → 200 + token
 *   业务拒绝   — 错密码 / 不存在邮箱 / 禁用账号
 *   输入边界   — 空 body / 缺字段 / 字段类型错误
 *   错误契约锁 — 所有错误响应 JSON + success:false + message 非空
 */
import request from 'supertest'
import prisma from '../config/database.js'
import app from '../app.js'

// ============== 测试数据 ==============

const validUser = {
  email: 'login-regression@example.com',
  password: 'ValidPass123',
  nickname: 'Login Regression User',
  securityQuestion: 0,
  securityAnswer: 'Answer'
}

const nonExistentUser = {
  email: 'login-regression-noexist@example.com',
  password: 'AnyPass123'
}

const bannedUser = {
  email: 'login-regression-banned@example.com',
  password: 'BannedPass123',
  nickname: 'Banned Login User',
  securityQuestion: 0,
  securityAnswer: 'Answer'
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

describe('P1 回归锁 — POST /api/auth/login', () => {
  beforeAll(async () => {
    // 清理 + 准备一个有效用户用于正常路径测试
    await prisma.securityAnswer.deleteMany({
      where: { user: { email: { in: [validUser.email, bannedUser.email] } } }
    })
    await prisma.user.deleteMany({
      where: { email: { in: [validUser.email, bannedUser.email] } }
    })

    await request(app).post('/api/auth/register').send(validUser)

    // 准备禁用账号
    await request(app).post('/api/auth/register').send(bannedUser)
    await prisma.user.update({
      where: { email: bannedUser.email },
      data: { isBanned: true }
    })
  })

  afterAll(async () => {
    await prisma.securityAnswer.deleteMany({
      where: { user: { email: { in: [validUser.email, bannedUser.email] } } }
    })
    await prisma.user.deleteMany({
      where: { email: { in: [validUser.email, bannedUser.email] } }
    })
    await prisma.$disconnect()
  })

  // --------------- 正常路径 ---------------

  describe('正常路径', () => {
    it('正确邮箱+密码 → 200 + token + user', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: validUser.email, password: validUser.password })
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.data).toHaveProperty('token')
      expect(res.body.data).toHaveProperty('user')
      expect(res.body.data.user.email).toBe(validUser.email)
      expect(res.body.data.user).not.toHaveProperty('password')
    })
  })

  // --------------- 业务拒绝(不允许 500) ---------------

  describe('业务拒绝 — 错误凭证', () => {
    it('邮箱不存在 → 401 结构化 JSON', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send(nonExistentUser)

      expectStructuredError(res, [401])
      expect(res.body.message).toMatch(/邮箱|密码/)
    })

    it('密码错误 → 401 结构化 JSON', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: validUser.email, password: 'WrongPass123' })

      expectStructuredError(res, [401])
      expect(res.body.message).toMatch(/邮箱|密码/)
    })

    it('账号被禁用 → 403 结构化 JSON', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: bannedUser.email, password: bannedUser.password })

      expectStructuredError(res, [403])
      expect(res.body.message).toMatch(/禁用/)
    })
  })

  // --------------- 输入校验边界(不允许 500) ---------------

  describe('输入校验边界', () => {
    it('空 body → 400 结构化 JSON', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({})

      expectStructuredError(res, [400])
    })

    it('缺 email 字段 → 400 结构化 JSON', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ password: 'SomePass123' })

      expectStructuredError(res, [400])
    })

    it('缺 password 字段 → 400 结构化 JSON', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: validUser.email })

      expectStructuredError(res, [400])
    })

    it('email 格式不合法 → 400 结构化 JSON', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'not-an-email', password: 'SomePass123' })

      expectStructuredError(res, [400])
    })

    it('email 为空字符串 → 400 结构化 JSON', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: '', password: 'SomePass123' })

      expectStructuredError(res, [400])
    })

    it('password 为空字符串 → 400 结构化 JSON', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: validUser.email, password: '' })

      expectStructuredError(res, [400])
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
      contentType?: string
      allowed: number[]
    }> = [
      { label: '空 body', payload: {}, allowed: [400] },
      { label: 'null body', payload: null, allowed: [400] },
      { label: '数组 body', payload: [], allowed: [400] },
      { label: '字符串 body', payload: 'not json', allowed: [400] },
      { label: '缺 email', payload: { password: 'x' }, allowed: [400] },
      { label: '缺 password', payload: { email: 'x@y.com' }, allowed: [400] },
      { label: '非法 email 格式', payload: { email: 'bad', password: 'x' }, allowed: [400] },
      { label: '空 email 字符串', payload: { email: '', password: 'x' }, allowed: [400] },
      { label: '空 password 字符串', payload: { email: 'x@y.com', password: '' }, allowed: [400] },
      { label: '不存在的账号', payload: nonExistentUser, allowed: [401] },
      { label: '错误密码', payload: { email: validUser.email, password: 'wrong' }, allowed: [401] },
      { label: '禁用账号', payload: { email: bannedUser.email, password: bannedUser.password }, allowed: [403] }
    ]

    for (const probe of errorProbes) {
      it(`${probe.label} → ${probe.allowed.join('/')} + 结构化 JSON (非 500)`, async () => {
        const req = request(app).post('/api/auth/login')
        if (probe.contentType) {
          req.set('Content-Type', probe.contentType)
        }
        const res = await req.send(probe.payload as object)

        expectStructuredError(res, probe.allowed)
      })
    }
  })
})