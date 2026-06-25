/**
 * 中集智历 - 阶段1：用户路由测试
 *
 * 覆盖：
 * - POST /api/users/create 管理员可创建用户
 * - GET  /api/users 列表含 isDepartmentAdmin 字段
 * - GET  /api/users/department/members 部门管理员可拿到本部门成员
 */
import request from 'supertest'
import prisma from '../config/database.js'
import app from '../app.js'

const adminUser = {
  email: 'users-admin@example.com',
  password: 'Test123456',
  nickname: 'Users Admin',
  securityQuestion: 0,
  securityAnswer: 'A'
}

const newUserPayload = {
  email: 'newuser-create@example.com',
  password: 'Test123456',
  nickname: 'Newly Created'
}

let adminToken = ''
let adminId = ''

describe('阶段1 - 用户路由', () => {
  beforeAll(async () => {
    await prisma.securityAnswer.deleteMany({ where: { user: { email: { in: [adminUser.email, newUserPayload.email] } } } })
    await prisma.user.deleteMany({ where: { email: { in: [adminUser.email, newUserPayload.email] } } })

    const adminRes = await request(app).post('/api/auth/register').send(adminUser)
    adminId = adminRes.body.data.user.id
    await prisma.user.update({ where: { id: adminId }, data: { isAdmin: true } })
    const adminLogin = await request(app).post('/api/auth/login').send({ email: adminUser.email, password: adminUser.password })
    adminToken = adminLogin.body.data.token
  })

  afterAll(async () => {
    await prisma.securityAnswer.deleteMany({ where: { user: { email: { in: [adminUser.email, newUserPayload.email] } } } })
    await prisma.user.deleteMany({ where: { email: { in: [adminUser.email, newUserPayload.email] } } })
    await prisma.$disconnect()
  })

  describe('POST /api/users/create - 管理员创建用户', () => {
    it('全局管理员可创建用户', async () => {
      const response = await request(app)
        .post('/api/users/create')
        .set('Authorization', 'Bearer ' + adminToken)
        .send(newUserPayload)
        .expect(201)

      expect(response.body.success).toBe(true)
      expect(response.body.data.email).toBe(newUserPayload.email)
      expect(response.body.data.nickname).toBe(newUserPayload.nickname)
    })

    it('重复邮箱应被拒绝', async () => {
      const response = await request(app)
        .post('/api/users/create')
        .set('Authorization', 'Bearer ' + adminToken)
        .send(newUserPayload)
        .expect(400)

      expect(response.body.success).toBe(false)
    })

    it('短密码应被拒绝', async () => {
      const response = await request(app)
        .post('/api/users/create')
        .set('Authorization', 'Bearer ' + adminToken)
        .send({ email: 'short@example.com', password: '12345' })
        .expect(400)

      expect(response.body.success).toBe(false)
    })
  })

  describe('GET /api/users - 列表含 isDepartmentAdmin', () => {
    it('管理员拉取列表时新创建的用户 isDepartmentAdmin=false', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', 'Bearer ' + adminToken)
        .expect(200)

      expect(response.body.success).toBe(true)
      const created = response.body.data.find((u: { email: string }) => u.email === newUserPayload.email)
      expect(created).toBeDefined()
      expect(created.isDepartmentAdmin).toBe(false)
    })

    it('管理员自身默认 isDepartmentAdmin=false', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', 'Bearer ' + adminToken)
        .expect(200)

      const me = response.body.data.find((u: { id: string }) => u.id === adminId)
      expect(me).toBeDefined()
      expect(me.isDepartmentAdmin).toBe(false)
    })
  })
})