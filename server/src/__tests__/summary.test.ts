/**
 * 中集智历 - 阶段1：项目工作总结路由测试
 *
 * 覆盖：
 * - POST /api/projects/:id/summaries 项目负责人可写
 * - GET  /api/projects/:id/summaries 项目成员可见
 * - POST /api/projects/:id/summaries/:id/ai-summary 触发 AI 总结（无 key 走降级）
 */
import request from 'supertest'
import prisma from '../config/database.js'
import app from '../app.js'

const ownerUser = {
  email: 'summary-owner@example.com',
  password: 'Test123456',
  nickname: 'Summary Owner',
  securityQuestion: 0,
  securityAnswer: 'Owner Answer'
}

const memberUser = {
  email: 'summary-member@example.com',
  password: 'Test123456',
  nickname: 'Summary Member',
  securityQuestion: 0,
  securityAnswer: 'Member Answer'
}

const outsiderUser = {
  email: 'summary-outsider@example.com',
  password: 'Test123456',
  nickname: 'Summary Outsider',
  securityQuestion: 0,
  securityAnswer: 'Outsider Answer'
}

let ownerToken = ''
let memberToken = ''
let outsiderToken = ''
let ownerId = ''
let projectId = ''
let summaryId = ''

describe('阶段1 - 项目工作总结路由', () => {
  beforeAll(async () => {
    // 清理
    await prisma.projectSummary.deleteMany({
      where: { project: { name: 'Summary Test Project' } }
    })
    await prisma.projectMember.deleteMany({
      where: { project: { name: 'Summary Test Project' } }
    })
    await prisma.project.deleteMany({ where: { name: 'Summary Test Project' } })
    await prisma.securityAnswer.deleteMany({
      where: { user: { email: { in: [ownerUser.email, memberUser.email, outsiderUser.email] } } }
    })
    await prisma.user.deleteMany({
      where: { email: { in: [ownerUser.email, memberUser.email, outsiderUser.email] } }
    })

    // 注册 3 个用户
    const ownerRes = await request(app).post('/api/auth/register').send(ownerUser)
    ownerToken = ownerRes.body.data.token
    ownerId = ownerRes.body.data.user.id

    const memberRes = await request(app).post('/api/auth/register').send(memberUser)
    memberToken = memberRes.body.data.token

    const outsiderRes = await request(app).post('/api/auth/register').send(outsiderUser)
    outsiderToken = outsiderRes.body.data.token

    // 创建项目
    const projectRes = await request(app)
      .post('/api/projects')
      .set('Authorization', 'Bearer ' + ownerToken)
      .send({ name: 'Summary Test Project', visibility: 'PUBLIC' })
    projectId = projectRes.body.data.id

    // 把 member 加进项目
    await request(app)
      .post('/api/projects/' + projectId + '/members')
      .set('Authorization', 'Bearer ' + ownerToken)
      .send({ userId: memberRes.body.data.user.id })
  })

  afterAll(async () => {
    await prisma.projectSummary.deleteMany({
      where: { project: { name: 'Summary Test Project' } }
    })
    await prisma.projectMember.deleteMany({
      where: { project: { name: 'Summary Test Project' } }
    })
    await prisma.project.deleteMany({ where: { name: 'Summary Test Project' } })
    await prisma.securityAnswer.deleteMany({
      where: { user: { email: { in: [ownerUser.email, memberUser.email, outsiderUser.email] } } }
    })
    await prisma.user.deleteMany({
      where: { email: { in: [ownerUser.email, memberUser.email, outsiderUser.email] } }
    })
    await prisma.$disconnect()
  })

  describe('POST /api/projects/:id/summaries - 创建工作总结', () => {
    it('项目负责人可创建工作总结', async () => {
      const response = await request(app)
        .post('/api/projects/' + projectId + '/summaries')
        .set('Authorization', 'Bearer ' + ownerToken)
        .send({ title: '本周工作总结', content: '完成 5 项关键节点任务' })
        .expect(201)

      expect(response.body.success).toBe(true)
      expect(response.body.data.title).toBe('本周工作总结')
      expect(response.body.data.content).toBe('完成 5 项关键节点任务')
      expect(response.body.data.authorId).toBe(ownerId)
      summaryId = response.body.data.id
    })

    it('非项目负责人且非管理员不可创建工作总结', async () => {
      const response = await request(app)
        .post('/api/projects/' + projectId + '/summaries')
        .set('Authorization', 'Bearer ' + memberToken)
        .send({ title: '越权写', content: '应该被拒' })
        .expect(403)

      expect(response.body.success).toBe(false)
    })

    it('空标题应被拒绝', async () => {
      const response = await request(app)
        .post('/api/projects/' + projectId + '/summaries')
        .set('Authorization', 'Bearer ' + ownerToken)
        .send({ title: '', content: '只填了内容' })
        .expect(400)

      expect(response.body.success).toBe(false)
    })
  })

  describe('GET /api/projects/:id/summaries - 列表查询', () => {
    it('项目成员可看到工作总结列表', async () => {
      const response = await request(app)
        .get('/api/projects/' + projectId + '/summaries')
        .set('Authorization', 'Bearer ' + memberToken)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(Array.isArray(response.body.data)).toBe(true)
      expect(response.body.data.length).toBeGreaterThanOrEqual(1)
    })

    it('非项目成员不可查看', async () => {
      const response = await request(app)
        .get('/api/projects/' + projectId + '/summaries')
        .set('Authorization', 'Bearer ' + outsiderToken)
        .expect(403)

      expect(response.body.success).toBe(false)
    })
  })

  describe('POST /api/projects/:id/summaries/:id/ai-summary - AI 总结', () => {
    it('项目负责人可触发 AI 总结（无 DEEPSEEK_API_KEY 走降级）', async () => {
      const before = process.env.DEEPSEEK_API_KEY
      delete process.env.DEEPSEEK_API_KEY
      try {
        const response = await request(app)
          .post('/api/projects/' + projectId + '/summaries/' + summaryId + '/ai-summary')
          .set('Authorization', 'Bearer ' + ownerToken)
          .expect(200)

        expect(response.body.success).toBe(true)
        expect(response.body.fallback).toBe(true)
        expect(response.body.data.aiContent).toBeTruthy()
        expect(response.body.data.aiGeneratedAt).toBeTruthy()
      } finally {
        if (before !== undefined) process.env.DEEPSEEK_API_KEY = before
      }
    })

    it('非负责人非部门管理员不可触发 AI 总结', async () => {
      const response = await request(app)
        .post('/api/projects/' + projectId + '/summaries/' + summaryId + '/ai-summary')
        .set('Authorization', 'Bearer ' + outsiderToken)
        .expect(403)

      expect(response.body.success).toBe(false)
    })
  })
})