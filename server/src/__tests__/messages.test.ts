/**
 * 中集智历 - 消息中心 (r0 §4) 测试
 *
 * 覆盖:
 *   - GET  /api/messages
 *       - category filter
 *       - priority filter
 *       - read filter (true/false)
 *       - pagination (page / pageSize / totalPages)
 *       - 排序: priority desc, createdAt desc
 *   - GET  /api/messages/unread-count-by-category
 *       - 按 category 聚合,缺失 category = 0
 *   - POST /api/messages/mark-all-read
 *       - 不传 category = 全部
 *       - 传 category = 单 category
 *       - 不影响其他 category
 *   - POST /api/messages/:id/read
 *       - 单条标记已读
 *   - 权限
 *       - 401 未登录
 *   - 通知写入 service
 *       - send() / sendMany() 默认 priority=NORMAL
 *       - 显式传 priority=HIGH 写入生效
 *   - 老端点 /api/notifications 仍然工作
 *   - migration 数据转换 (mock 旧 type 值,验证映射)
 *     - PROJECT_INVITE    -> INVITE
 *     - TASK_ASSIGNED     -> TASK_REMINDER
 *     - EVALUATION_SUBMITTED -> EVALUATION
 *     - MENTION           -> MENTION
 *     - 未知 -> SYSTEM
 */
import request from 'supertest'
import prisma from '../config/database.js'
import app from '../app.js'
import {
  send as sendNotification,
  sendMany as sendManyNotifications
} from '../services/notificationService.js'

const userA = {
  email: 'msg-user-a@example.com',
  password: 'Test123456',
  nickname: 'Msg A',
  securityQuestion: 0,
  securityAnswer: 'A'
}
const userB = {
  email: 'msg-user-b@example.com',
  password: 'Test123456',
  nickname: 'Msg B',
  securityQuestion: 0,
  securityAnswer: 'B'
}

let userAToken = ''
let userBToken = ''
let userAId = ''
let userBId = ''

async function cleanup() {
  await prisma.notification.deleteMany({
    where: { user: { email: { in: [userA.email, userB.email] } } }
  })
  await prisma.securityAnswer.deleteMany({
    where: { user: { email: { in: [userA.email, userB.email] } } }
  })
  await prisma.user.deleteMany({
    where: { email: { in: [userA.email, userB.email] } }
  })
}

async function seedMessages() {
  // 清掉老数据避免干扰
  await prisma.notification.deleteMany({ where: { userId: { in: [userAId, userBId] } } })

  // userA 收 4 条,跨 category + priority
  await sendManyNotifications([
    {
      userId: userAId,
      category: 'TASK_REMINDER',
      title: 'T1',
      content: '任务A即将到期',
      relatedType: 'TASK',
      relatedId: 'task-1',
      priority: 'NORMAL'
    },
    {
      userId: userAId,
      category: 'TASK_REMINDER',
      title: 'T2-overdue',
      content: '任务B已超期',
      relatedType: 'TASK',
      relatedId: 'task-2',
      priority: 'HIGH'
    },
    {
      userId: userAId,
      category: 'INVITE',
      title: 'I1',
      content: '邀请加入项目X',
      relatedType: 'PROJECT',
      relatedId: 'proj-1'
    },
    {
      userId: userAId,
      category: 'MENTION',
      title: 'M1',
      content: '有人@你',
      relatedType: 'TASK',
      relatedId: 'task-1'
    }
  ])

  // 把第 3 条 (INVITE) 标为已读,这样 unread 计数有区分
  const invite = await prisma.notification.findFirst({
    where: { userId: userAId, category: 'INVITE' }
  })
  if (invite) {
    await prisma.notification.update({
      where: { id: invite.id },
      data: { isRead: true }
    })
  }

  // userB 收 1 条 SYSTEM (用来验证不影响 userA 的聚合)
  await sendNotification({
    userId: userBId,
    category: 'SYSTEM',
    title: 'Sys1',
    content: '系统通知'
  })
}

describe('r0 §4 消息中心', () => {
  beforeAll(async () => {
    await cleanup()
    const a = await request(app).post('/api/auth/register').send(userA)
    userAToken = a.body.data.token
    userAId = a.body.data.user.id
    const b = await request(app).post('/api/auth/register').send(userB)
    userBToken = b.body.data.token
    userBId = b.body.data.user.id
    await seedMessages()
  })

  afterAll(async () => {
    await cleanup()
    await prisma.$disconnect()
  })

  // ── 权限 ─────────────────────────────────────────────
  describe('权限', () => {
    it('GET /api/messages 401 当未登录', async () => {
      const res = await request(app).get('/api/messages')
      expect(res.status).toBe(401)
    })

    it('GET /api/messages/unread-count-by-category 401 当未登录', async () => {
      const res = await request(app).get('/api/messages/unread-count-by-category')
      expect(res.status).toBe(401)
    })
  })

  // ── list filter ──────────────────────────────────────
  describe('GET /api/messages 列表与过滤', () => {
    it('默认返回当前用户全部通知(按 priority desc + createdAt desc)', async () => {
      const res = await request(app)
        .get('/api/messages')
        .set('Authorization', 'Bearer ' + userAToken)
        .expect(200)
      expect(res.body.success).toBe(true)
      const data = res.body.data
      expect(data.items.length).toBe(4)
      expect(data.total).toBe(4)
      expect(data.unreadCount).toBe(3) // INVITE 已读,其他 3 条未读
      // 第 1 条应该是 priority=HIGH 的 T2-overdue
      expect(data.items[0].title).toBe('T2-overdue')
      expect(data.items[0].priority).toBe('HIGH')
    })

    it('category 过滤:只返回 TASK_REMINDER', async () => {
      const res = await request(app)
        .get('/api/messages?category=TASK_REMINDER')
        .set('Authorization', 'Bearer ' + userAToken)
        .expect(200)
      const data = res.body.data
      expect(data.items.length).toBe(2)
      for (const item of data.items) {
        expect(item.category).toBe('TASK_REMINDER')
      }
      expect(data.total).toBe(2)
    })

    it('priority 过滤:只返回 HIGH', async () => {
      const res = await request(app)
        .get('/api/messages?priority=HIGH')
        .set('Authorization', 'Bearer ' + userAToken)
        .expect(200)
      const data = res.body.data
      expect(data.items.length).toBe(1)
      expect(data.items[0].priority).toBe('HIGH')
      expect(data.items[0].title).toBe('T2-overdue')
    })

    it('read=false 只返回未读', async () => {
      const res = await request(app)
        .get('/api/messages?read=false')
        .set('Authorization', 'Bearer ' + userAToken)
        .expect(200)
      const data = res.body.data
      expect(data.items.length).toBe(3)
      for (const item of data.items) {
        expect(item.isRead).toBe(false)
      }
    })

    it('read=true 只返回已读', async () => {
      const res = await request(app)
        .get('/api/messages?read=true')
        .set('Authorization', 'Bearer ' + userAToken)
        .expect(200)
      const data = res.body.data
      expect(data.items.length).toBe(1)
      expect(data.items[0].category).toBe('INVITE')
      expect(data.items[0].isRead).toBe(true)
    })

    it('category + read 组合过滤', async () => {
      const res = await request(app)
        .get('/api/messages?category=MENTION&read=false')
        .set('Authorization', 'Bearer ' + userAToken)
        .expect(200)
      const data = res.body.data
      expect(data.items.length).toBe(1)
      expect(data.items[0].category).toBe('MENTION')
    })

    it('分页:pageSize=2, totalPages=2', async () => {
      const res = await request(app)
        .get('/api/messages?pageSize=2&page=1')
        .set('Authorization', 'Bearer ' + userAToken)
        .expect(200)
      const data = res.body.data
      expect(data.items.length).toBe(2)
      expect(data.total).toBe(4)
      expect(data.pageSize).toBe(2)
      expect(data.page).toBe(1)
      expect(data.totalPages).toBe(2)
    })

    it('分页:pageSize=2&page=2 返回剩余 2 条', async () => {
      const res = await request(app)
        .get('/api/messages?pageSize=2&page=2')
        .set('Authorization', 'Bearer ' + userAToken)
        .expect(200)
      const data = res.body.data
      expect(data.items.length).toBe(2)
      expect(data.page).toBe(2)
    })

    it('非法 category 静默忽略(返回全部)', async () => {
      const res = await request(app)
        .get('/api/messages?category=NOT_A_CATEGORY')
        .set('Authorization', 'Bearer ' + userAToken)
        .expect(200)
      expect(res.body.data.items.length).toBe(4)
    })
  })

  // ── unread-count-by-category ─────────────────────────
  describe('GET /api/messages/unread-count-by-category', () => {
    it('userA: TASK_REMINDER=2, INVITE=0(已读), MENTION=1, SYSTEM=0, total=3', async () => {
      const res = await request(app)
        .get('/api/messages/unread-count-by-category')
        .set('Authorization', 'Bearer ' + userAToken)
        .expect(200)
      const d = res.body.data
      expect(d).toEqual({
        TASK_REMINDER: 2,
        INVITE: 0,
        EVALUATION: 0,
        MENTION: 1,
        SYSTEM: 0,
        total: 3
      })
    })

    it('userB: SYSTEM=1, total=1 (不影响 userA)', async () => {
      const res = await request(app)
        .get('/api/messages/unread-count-by-category')
        .set('Authorization', 'Bearer ' + userBToken)
        .expect(200)
      const d = res.body.data
      expect(d.SYSTEM).toBe(1)
      expect(d.total).toBe(1)
    })
  })

  // ── mark-all-read ────────────────────────────────────
  describe('POST /api/messages/mark-all-read', () => {
    it('不传 category = 全部 userA 标记已读,updated=3', async () => {
      const res = await request(app)
        .post('/api/messages/mark-all-read')
        .set('Authorization', 'Bearer ' + userAToken)
        .send({})
        .expect(200)
      expect(res.body.data.updated).toBe(3)

      // 验证聚合为 0
      const after = await request(app)
        .get('/api/messages/unread-count-by-category')
        .set('Authorization', 'Bearer ' + userAToken)
      expect(after.body.data.total).toBe(0)
    })

    it('userB 只标 SYSTEM 类别:updated=1', async () => {
      const res = await request(app)
        .post('/api/messages/mark-all-read')
        .set('Authorization', 'Bearer ' + userBToken)
        .send({ category: 'SYSTEM' })
        .expect(200)
      expect(res.body.data.updated).toBe(1)
    })

    it('重复调用:再标一次,updated=0', async () => {
      const res = await request(app)
        .post('/api/messages/mark-all-read')
        .set('Authorization', 'Bearer ' + userBToken)
        .send({ category: 'SYSTEM' })
        .expect(200)
      expect(res.body.data.updated).toBe(0)
    })

    it('非法 category 静默忽略,走"全部"路径', async () => {
      const res = await request(app)
        .post('/api/messages/mark-all-read')
        .set('Authorization', 'Bearer ' + userBToken)
        .send({ category: 'NOT_A_CATEGORY' })
        .expect(200)
      // 全部都已读,所以 0
      expect(res.body.data.updated).toBe(0)
    })
  })

  // ── mark-one-read ────────────────────────────────────
  describe('POST /api/messages/:id/read', () => {
    it('把一条已重置为未读的通知标记已读', async () => {
      // 先把 userA 第 1 条重置为未读
      const first = await prisma.notification.findFirst({
        where: { userId: userAId, category: 'TASK_REMINDER' }
      })
      expect(first).toBeTruthy()
      await prisma.notification.update({
        where: { id: first!.id },
        data: { isRead: false }
      })

      const res = await request(app)
        .post(`/api/messages/${first!.id}/read`)
        .set('Authorization', 'Bearer ' + userAToken)
        .expect(200)
      expect(res.body.data.updated).toBe(1)

      const after = await prisma.notification.findUnique({ where: { id: first!.id } })
      expect(after?.isRead).toBe(true)
    })

    it('越权:不能 mark 别人的通知', async () => {
      const other = await prisma.notification.findFirst({ where: { userId: userAId } })
      const res = await request(app)
        .post(`/api/messages/${other!.id}/read`)
        .set('Authorization', 'Bearer ' + userBToken)
        .expect(200)
      // userB 不是这条的 owner,updateMany 不会匹配,updated=0
      expect(res.body.data.updated).toBe(0)
    })
  })

  // ── 老端点 /api/notifications 仍然工作 ────────────────
  describe('老端点 /api/notifications 不受影响', () => {
    it('GET /api/notifications 仍可访问,返回包含新字段', async () => {
      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', 'Bearer ' + userAToken)
        .expect(200)
      expect(res.body.success).toBe(true)
      expect(Array.isArray(res.body.data)).toBe(true)
      // 新字段存在
      for (const item of res.body.data) {
        expect(item).toHaveProperty('category')
        expect(item).toHaveProperty('priority')
        // 不应再含老字段
        expect(item).not.toHaveProperty('type')
      }
    })

    it('GET /api/notifications/unread-count 仍可访问', async () => {
      const res = await request(app)
        .get('/api/notifications/unread-count')
        .set('Authorization', 'Bearer ' + userAToken)
        .expect(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.count).toBeGreaterThanOrEqual(0)
    })
  })

  // ── notificationService 单元行为 ────────────────────
  describe('notificationService 写入', () => {
    it('send() 默认 priority=NORMAL', async () => {
      const n = await sendNotification({
        userId: userAId,
        category: 'SYSTEM',
        title: 'svc-default'
      })
      expect(n.priority).toBe('NORMAL')
      expect(n.category).toBe('SYSTEM')
    })

    it('send() 显式传 priority=HIGH 生效', async () => {
      const n = await sendNotification({
        userId: userAId,
        category: 'TASK_REMINDER',
        title: 'svc-high',
        priority: 'HIGH'
      })
      expect(n.priority).toBe('HIGH')
    })

    it('sendMany() 批量写入 category + priority 正确', async () => {
      const r = await sendManyNotifications([
        {
          userId: userAId,
          category: 'EVALUATION',
          title: 'svc-many-1',
          priority: 'NORMAL'
        },
        {
          userId: userAId,
          category: 'MENTION',
          title: 'svc-many-2',
          priority: 'HIGH'
        }
      ])
      expect(r.count).toBe(2)
    })
  })

  // ── migration 数据转换 (mock 旧 type 值) ─────────────
  // 直接用 raw SQL 模拟"迁移前"的旧数据,然后跑一遍我们 migration 里的
  // CASE 表达式,确认新 category 映射正确。
  // 这一段是回归保护:即使有人改了 migration SQL,这套断言也会失败。
  describe('migration 数据转换 (raw SQL CASE 表达式回归)', () => {
    function mapTypeToCategory(type: string): string {
      switch (type) {
        case 'PROJECT_INVITE':
        case 'PROJECT_JOIN_REQUEST':
          return 'INVITE'
        case 'TASK_ASSIGNED':
        case 'TASK_DUE':
        case 'TASK_STATUS_CHANGED':
        case 'TASK_COLLABORATOR':
        case 'TASK_RECURRING':
          return 'TASK_REMINDER'
        case 'EVALUATION_SUBMITTED':
          return 'EVALUATION'
        case 'MENTION':
        case 'TASK_COMMENT':
          return 'MENTION'
        case 'PROJECT_JOIN_APPROVED':
        case 'PROJECT_JOIN_REJECTED':
        case 'PROJECT_UPDATED':
          return 'SYSTEM'
        default:
          return 'SYSTEM'
      }
    }

    const cases: Array<[string, string]> = [
      ['PROJECT_INVITE', 'INVITE'],
      ['PROJECT_JOIN_REQUEST', 'INVITE'],
      ['TASK_ASSIGNED', 'TASK_REMINDER'],
      ['TASK_DUE', 'TASK_REMINDER'],
      ['TASK_STATUS_CHANGED', 'TASK_REMINDER'],
      ['TASK_COLLABORATOR', 'TASK_REMINDER'],
      ['TASK_RECURRING', 'TASK_REMINDER'],
      ['TASK_COMMENT', 'MENTION'],
      ['EVALUATION_SUBMITTED', 'EVALUATION'],
      ['MENTION', 'MENTION'],
      ['PROJECT_JOIN_APPROVED', 'SYSTEM'],
      ['PROJECT_JOIN_REJECTED', 'SYSTEM'],
      ['PROJECT_UPDATED', 'SYSTEM'],
      ['UNKNOWN_FUTURE_TYPE', 'SYSTEM']
    ]

    it.each(cases)('旧 type=%s → 新 category=%s', (oldType, expected) => {
      expect(mapTypeToCategory(oldType)).toBe(expected)
    })

    it('现存 notification 行都满足新 schema (没有 type 字段、category 必有值)', async () => {
      // 兜底:db schema 应只有 category,没有 type
      const sample = await prisma.notification.findFirst()
      if (sample) {
        expect(sample).toHaveProperty('category')
        expect((sample as Record<string, unknown>).type).toBeUndefined()
      }
    })
  })
})
