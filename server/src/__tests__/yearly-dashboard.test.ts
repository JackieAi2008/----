/**
 * 中集智历 - R0 阶段 2: 年度看板 (GET /api/dashboard/yearly) 测试
 *
 * 覆盖:
 *  - 正常路径: 4 张卡 + byMonth 12 个月
 *  - 跨年任务不串: 2025 年任务不会出现在 2026 年统计里
 *  - 无任务年份: year=2024 (数据是 2026 年的) 返回 0
 *  - 权限: 401 未登录
 *  - 参数: 缺 year / 越界 year 返回 400
 *  - 我参与/可见: assigneeId=me + 协作人包含 me 都算
 */
import request from 'supertest'
import prisma from '../config/database.js'
import app from '../app.js'

const userA = {
  email: 'yearly-user-a@example.com',
  password: 'Test123456',
  nickname: 'Yearly User A',
  securityQuestion: 0,
  securityAnswer: 'A'
}

const userB = {
  email: 'yearly-user-b@example.com',
  password: 'Test123456',
  nickname: 'Yearly User B',
  securityQuestion: 0,
  securityAnswer: 'B'
}

let userAToken = ''
let userBToken = ''
let userAId = ''

const TEST_PROJECT_NAME = 'Yearly Dashboard Test Project'

async function cleanup() {
  // 删任务(按标题前缀)+ 项目 + 用户
  await prisma.task.deleteMany({
    where: { project: { name: TEST_PROJECT_NAME } }
  })
  await prisma.projectMember.deleteMany({
    where: { project: { name: TEST_PROJECT_NAME } }
  })
  await prisma.project.deleteMany({ where: { name: TEST_PROJECT_NAME } })
  await prisma.securityAnswer.deleteMany({
    where: { user: { email: { in: [userA.email, userB.email] } } }
  })
  await prisma.user.deleteMany({
    where: { email: { in: [userA.email, userB.email] } }
  })
}

/**
 * 在 2026 年各个月份铺 N 个任务,状态可定制
 *  - assigneeId = userAId
 *  - status 默认 TODO
 */
async function seedTasksIn2026(
  items: Array<{ month: number; status?: string; isCollaborator?: boolean; title?: string }>
) {
  for (let i = 0; i < items.length; i++) {
    const it = items[i]
    const dueDate = new Date(Date.UTC(2026, it.month - 1, 15, 12, 0, 0))
    const proj = await prisma.project.findFirst({ where: { name: TEST_PROJECT_NAME } })
    if (!proj) throw new Error('test project missing')
    const task = await prisma.task.create({
      data: {
        title: it.title || `yearly-test-task-${i}`,
        description: 'test',
        startDate: new Date(Date.UTC(2026, it.month - 1, 1)),
        dueDate,
        status: it.status || 'TODO',
        priority: 'IMPORTANT_URGENT',
        assigneeId: userAId,
        creatorId: userAId,
        projectId: proj.id,
        deletedAt: null
      }
    })
    if (it.isCollaborator) {
      await prisma.taskCollaborator.create({
        data: { taskId: task.id, userId: userBId! }
      })
    }
  }
}

let userBId = ''

describe('R0 §2 - GET /api/dashboard/yearly', () => {
  beforeAll(async () => {
    await cleanup()

    // 注册两个用户
    const aRes = await request(app).post('/api/auth/register').send(userA)
    userAToken = aRes.body.data.token
    userAId = aRes.body.data.user.id

    const bRes = await request(app).post('/api/auth/register').send(userB)
    userBToken = bRes.body.data.token
    userBId = bRes.body.data.user.id

    // A 建项目, B 协作
    const projRes = await request(app)
      .post('/api/projects')
      .set('Authorization', 'Bearer ' + userAToken)
      .send({ name: TEST_PROJECT_NAME, visibility: 'PUBLIC' })
    const projectId = projRes.body.data.id
    await request(app)
      .post(`/api/projects/${projectId}/members`)
      .set('Authorization', 'Bearer ' + userAToken)
      .send({ userId: userBId })
  })

  afterAll(async () => {
    await cleanup()
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    // 每个用例前清掉这个测试项目下所有任务,避免脏数据
    await prisma.taskCollaborator.deleteMany({
      where: { task: { project: { name: TEST_PROJECT_NAME } } }
    })
    await prisma.task.deleteMany({
      where: { project: { name: TEST_PROJECT_NAME } }
    })
  })

  // ============== 正常路径 ==============

  describe('正常路径', () => {
    it('空年份 → 4 张卡全 0 + byMonth 全 0', async () => {
      const res = await request(app)
        .get('/api/dashboard/yearly?year=2026')
        .set('Authorization', 'Bearer ' + userAToken)
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(res.body.data.year).toBe(2026)
      expect(res.body.data.yearlyTotal).toBe(0)
      expect(res.body.data.yearlyTodo).toBe(0)
      expect(res.body.data.yearlyOverdue).toBe(0)
      expect(res.body.data.yearlyDone).toBe(0)
      expect(res.body.data.byMonth).toHaveLength(12)
      for (const m of res.body.data.byMonth) {
        expect(m.month).toBeGreaterThanOrEqual(1)
        expect(m.month).toBeLessThanOrEqual(12)
        expect(m.total).toBe(0)
        expect(m.done).toBe(0)
      }
    })

    it('铺 4 个任务 (3 TODO + 1 DONE) → yearlyTotal=4 yearlyTodo=3 yearlyDone=1', async () => {
      // 全部 dueDate 都在 2026-12 (未来月), 避免受 now 影响误判 overdue
      await seedTasksIn2026([
        { month: 8, status: 'TODO' },
        { month: 9, status: 'TODO' },
        { month: 10, status: 'DONE' },
        { month: 12, status: 'TODO' }
      ])

      const res = await request(app)
        .get('/api/dashboard/yearly?year=2026')
        .set('Authorization', 'Bearer ' + userAToken)
        .expect(200)

      expect(res.body.data.yearlyTotal).toBe(4)
      expect(res.body.data.yearlyTodo).toBe(3)
      expect(res.body.data.yearlyDone).toBe(1)
      expect(res.body.data.yearlyOverdue).toBe(0) // 都在 2026-08 之后,now=2026-06, 没到 dueDate
    })

    it('3 个 TODO 全在 1/3/5 月 (历史) → yearlyOverdue=3', async () => {
      await seedTasksIn2026([
        { month: 1, status: 'TODO' },
        { month: 3, status: 'TODO' },
        { month: 5, status: 'TODO' }
      ])

      const res = await request(app)
        .get('/api/dashboard/yearly?year=2026')
        .set('Authorization', 'Bearer ' + userAToken)
        .expect(200)

      expect(res.body.data.yearlyTotal).toBe(3)
      expect(res.body.data.yearlyTodo).toBe(3)
      expect(res.body.data.yearlyOverdue).toBe(3) // 全在 2026-06 之前,now=2026-06
    })

    it('byMonth 12 个月分布正确 (按 dueDate 落月)', async () => {
      await seedTasksIn2026([
        { month: 1, status: 'TODO' },
        { month: 1, status: 'DONE' },
        { month: 2, status: 'TODO' },
        { month: 5, status: 'TODO' },
        { month: 12, status: 'DONE' }
      ])

      const res = await request(app)
        .get('/api/dashboard/yearly?year=2026')
        .set('Authorization', 'Bearer ' + userAToken)
        .expect(200)

      const byMonth = res.body.data.byMonth
      // 1月: 1 todo + 1 done = total 2, done 1
      expect(byMonth.find((m: { month: number }) => m.month === 1)).toEqual({ month: 1, total: 2, done: 1 })
      // 2月: 1 todo
      expect(byMonth.find((m: { month: number }) => m.month === 2)).toEqual({ month: 2, total: 1, done: 0 })
      // 5月: 1 todo
      expect(byMonth.find((m: { month: number }) => m.month === 5)).toEqual({ month: 5, total: 1, done: 0 })
      // 12月: 1 done
      expect(byMonth.find((m: { month: number }) => m.month === 12)).toEqual({ month: 12, total: 1, done: 1 })
      // 其他月份 0
      const zeroMonths = byMonth.filter(
        (m: { month: number; total: number; done: number }) => ![1, 2, 5, 12].includes(m.month)
      )
      for (const m of zeroMonths) {
        expect(m.total).toBe(0)
        expect(m.done).toBe(0)
      }
    })
  })

  // ============== 跨年任务不串 ==============

  describe('跨年任务不串', () => {
    it('2025 年的任务不会出现在 2026 年统计里', async () => {
      // 2025 年 6 月 1 个任务
      const proj = await prisma.project.findFirst({ where: { name: TEST_PROJECT_NAME } })
      await prisma.task.create({
        data: {
          title: '2025 task',
          description: 'test',
          startDate: new Date(Date.UTC(2025, 0, 1)),
          dueDate: new Date(Date.UTC(2025, 5, 15)),
          status: 'TODO',
          priority: 'IMPORTANT_URGENT',
          assigneeId: userAId,
          creatorId: userAId,
          projectId: proj!.id
        }
      })
      // 2026 年 1 个任务
      await seedTasksIn2026([{ month: 7, status: 'DONE' }])

      const res = await request(app)
        .get('/api/dashboard/yearly?year=2026')
        .set('Authorization', 'Bearer ' + userAToken)
        .expect(200)

      // 只看到 2026 那个
      expect(res.body.data.yearlyTotal).toBe(1)
      expect(res.body.data.yearlyDone).toBe(1)
      const july = res.body.data.byMonth.find((m: { month: number }) => m.month === 7)
      expect(july).toEqual({ month: 7, total: 1, done: 1 })
    })

    it('year=2024 (无任务) → 全部 0', async () => {
      await seedTasksIn2026([{ month: 5, status: 'DONE' }])

      const res = await request(app)
        .get('/api/dashboard/yearly?year=2024')
        .set('Authorization', 'Bearer ' + userAToken)
        .expect(200)

      expect(res.body.data.year).toBe(2024)
      expect(res.body.data.yearlyTotal).toBe(0)
      expect(res.body.data.yearlyTodo).toBe(0)
      expect(res.body.data.yearlyOverdue).toBe(0)
      expect(res.body.data.yearlyDone).toBe(0)
    })
  })

  // ============== 我参与/可见: 协作人也算 ==============

  describe('协作人也被计入', () => {
    it('userB 不是 assignee,但是协作人 → 算进 userB 的 yearlyTotal', async () => {
      // userA 是 assignee
      await seedTasksIn2026([
        { month: 1, status: 'TODO', isCollaborator: true }, // B 协作
        { month: 2, status: 'TODO' } // 只有 A
      ])

      // A 看到 2 个
      const aRes = await request(app)
        .get('/api/dashboard/yearly?year=2026')
        .set('Authorization', 'Bearer ' + userAToken)
        .expect(200)
      expect(aRes.body.data.yearlyTotal).toBe(2)

      // B 只看到协作那 1 个
      const bRes = await request(app)
        .get('/api/dashboard/yearly?year=2026')
        .set('Authorization', 'Bearer ' + userBToken)
        .expect(200)
      expect(bRes.body.data.yearlyTotal).toBe(1)
    })
  })

  // ============== 权限 + 参数 ==============

  describe('权限 + 参数', () => {
    it('未带 token → 401', async () => {
      const res = await request(app)
        .get('/api/dashboard/yearly?year=2026')
      expect(res.status).toBe(401)
    })

    it('缺 year 参数 → 400', async () => {
      const res = await request(app)
        .get('/api/dashboard/yearly')
        .set('Authorization', 'Bearer ' + userAToken)
      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
      expect(res.body.message).toMatch(/year/)
    })

    it('year 越界 (1999) → 400', async () => {
      const res = await request(app)
        .get('/api/dashboard/yearly?year=1999')
        .set('Authorization', 'Bearer ' + userAToken)
      expect(res.status).toBe(400)
    })

    it('year 越界 (2101) → 400', async () => {
      const res = await request(app)
        .get('/api/dashboard/yearly?year=2101')
        .set('Authorization', 'Bearer ' + userAToken)
      expect(res.status).toBe(400)
    })

    it('year 非整数 (2026.5) → 400', async () => {
      const res = await request(app)
        .get('/api/dashboard/yearly?year=2026.5')
        .set('Authorization', 'Bearer ' + userAToken)
      expect(res.status).toBe(400)
    })
  })
})
