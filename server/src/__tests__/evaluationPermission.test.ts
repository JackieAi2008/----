/**
 * 中集智历 - 阶段1：评价权限扩展测试
 *
 * 覆盖：
 * - 全局管理员（isAdmin=true）可创建评价
 * - 项目所属部门的部门管理员可创建评价
 * - 普通用户不可创建评价
 */
import request from 'supertest'
import prisma from '../config/database.js'
import app from '../app.js'

const adminUser = {
  email: 'ep-admin@example.com',
  password: 'Test123456',
  nickname: 'EP Admin',
  securityQuestion: 0,
  securityAnswer: 'A'
}

const memberUser = {
  email: 'ep-member@example.com',
  password: 'Test123456',
  nickname: 'EP Member',
  securityQuestion: 0,
  securityAnswer: 'A'
}

const otherDeptMemberUser = {
  email: 'ep-otherdept@example.com',
  password: 'Test123456',
  nickname: 'EP OtherDept',
  securityQuestion: 0,
  securityAnswer: 'A'
}

let adminToken = ''
let memberToken = ''
let otherDeptToken = ''
let adminId = ''
let memberId = ''
let otherDeptId = ''
let deptAdminUserId = ''
let deptAdminToken = ''
let deptId = ''
let projectId = ''
let taskId = ''

describe('阶段1 - 评价权限扩展', () => {
  beforeAll(async () => {
    // 清理
    await prisma.evaluation.deleteMany({ where: { task: { title: 'EP Test Task' } } })
    await prisma.task.deleteMany({ where: { title: 'EP Test Task' } })
    await prisma.projectMember.deleteMany({ where: { project: { name: 'EP Test Project' } } })
    await prisma.project.deleteMany({ where: { name: 'EP Test Project' } })
    await prisma.user.deleteMany({ where: { email: { in: [memberUser.email, otherDeptMemberUser.email] } } })
    await prisma.department.deleteMany({ where: { name: { in: ['EP Dept 1', 'EP Dept 2'] } } })
    await prisma.user.deleteMany({ where: { email: { in: [adminUser.email, 'ep-deptadmin@example.com'] } } })

    // 创建 admin（isAdmin=true）
    const adminRes = await request(app).post('/api/auth/register').send(adminUser)
    await prisma.user.update({ where: { id: adminRes.body.data.user.id }, data: { isAdmin: true } })
    const adminLogin = await request(app).post('/api/auth/login').send({ email: adminUser.email, password: adminUser.password })
    adminToken = adminLogin.body.data.token
    adminId = adminLogin.body.data.user.id

    // 创建部门管理员用户
    const deptAdminSignup = await request(app).post('/api/auth/register').send({
      email: 'ep-deptadmin@example.com',
      password: 'Test123456',
      nickname: 'EP DeptAdmin',
      securityQuestion: 0,
      securityAnswer: 'A'
    })
    deptAdminUserId = deptAdminSignup.body.data.user.id
    const deptAdminLogin = await request(app).post('/api/auth/login').send({ email: 'ep-deptadmin@example.com', password: 'Test123456' })
    deptAdminToken = deptAdminLogin.body.data.token

    // 创建部门 1，让部门管理员为 deptAdmin
    const dept1 = await prisma.department.create({
      data: { name: 'EP Dept 1', adminId: deptAdminUserId }
    })
    deptId = dept1.id
    // 把 deptAdmin 绑定到部门
    await prisma.user.update({ where: { id: deptAdminUserId }, data: { departmentId: deptId } })

    // 创建部门 2（admin 作 admin）
    const dept2 = await prisma.department.create({ data: { name: 'EP Dept 2', adminId: adminId } })

    // 注册 member（同部门 1）
    const memberRes = await request(app).post('/api/auth/register').send(memberUser)
    memberId = memberRes.body.data.user.id
    await prisma.user.update({ where: { id: memberId }, data: { departmentId: deptId } })
    const memberLogin = await request(app).post('/api/auth/login').send({ email: memberUser.email, password: memberUser.password })
    memberToken = memberLogin.body.data.token

    // 注册 otherDeptMember（部门 2）
    const otherRes = await request(app).post('/api/auth/register').send(otherDeptMemberUser)
    otherDeptId = otherRes.body.data.user.id
    await prisma.user.update({ where: { id: otherDeptId }, data: { departmentId: dept2.id } })
    const otherLogin = await request(app).post('/api/auth/login').send({ email: otherDeptMemberUser.email, password: otherDeptMemberUser.password })
    otherDeptToken = otherLogin.body.data.token

    // 创建项目（归属部门 1）
    const projectRes = await request(app)
      .post('/api/projects')
      .set('Authorization', 'Bearer ' + adminToken)
      .send({ name: 'EP Test Project', visibility: 'PUBLIC', category: 'PARTY_BUILDING' })
    projectId = projectRes.body.data.id
    await prisma.project.update({ where: { id: projectId }, data: { departmentId: deptId } })

    // 添加成员
    await request(app)
      .post('/api/projects/' + projectId + '/members')
      .set('Authorization', 'Bearer ' + adminToken)
      .send({ userId: memberId })
    await request(app)
      .post('/api/projects/' + projectId + '/members')
      .set('Authorization', 'Bearer ' + adminToken)
      .send({ userId: otherDeptId })
    await request(app)
      .post('/api/projects/' + projectId + '/members')
      .set('Authorization', 'Bearer ' + adminToken)
      .send({ userId: deptAdminUserId })

    // 创建任务，assignee = member
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const taskRes = await request(app)
      .post('/api/tasks')
      .set('Authorization', 'Bearer ' + adminToken)
      .send({
        projectId,
        title: 'EP Test Task',
        dueDate: tomorrow.toISOString(),
        assigneeId: memberId
      })
    taskId = taskRes.body.data.id
  })

  afterAll(async () => {
    await prisma.evaluation.deleteMany({ where: { task: { title: 'EP Test Task' } } })
    await prisma.task.deleteMany({ where: { title: 'EP Test Task' } })
    await prisma.projectMember.deleteMany({ where: { project: { name: 'EP Test Project' } } })
    await prisma.project.deleteMany({ where: { name: 'EP Test Project' } })
    await prisma.user.updateMany({ where: { departmentId: { in: (await prisma.department.findMany({ where: { name: { in: ['EP Dept 1', 'EP Dept 2'] } } })).map(d => d.id) } }, data: { departmentId: null } })
    await prisma.department.deleteMany({ where: { name: { in: ['EP Dept 1', 'EP Dept 2'] } } })
    await prisma.securityAnswer.deleteMany({ where: { user: { email: { in: [adminUser.email, memberUser.email, otherDeptMemberUser.email, 'ep-deptadmin@example.com'] } } } })
    await prisma.user.deleteMany({ where: { email: { in: [adminUser.email, memberUser.email, otherDeptMemberUser.email, 'ep-deptadmin@example.com'] } } })
    await prisma.$disconnect()
  })

  describe('POST /api/evaluations - 评价权限', () => {
    it('全局管理员（isAdmin=true）可创建评价', async () => {
      const response = await request(app)
        .post('/api/evaluations')
        .set('Authorization', 'Bearer ' + adminToken)
        .send({ taskId, targetUserId: memberId, rating: 5, comment: '全局管理员评价' })
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.rating).toBe(5)
    })

    it('项目所属部门的部门管理员可创建评价', async () => {
      const response = await request(app)
        .post('/api/evaluations')
        .set('Authorization', 'Bearer ' + deptAdminToken)
        .send({ taskId, targetUserId: memberId, rating: 4, comment: '部门管理员评价' })
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.evaluatorId).toBe(deptAdminUserId)
    })

    it('同部门普通成员（非部门管理员）不可创建评价', async () => {
      const response = await request(app)
        .post('/api/evaluations')
        .set('Authorization', 'Bearer ' + memberToken)
        .send({ taskId, targetUserId: memberId, rating: 4, comment: '应被拒' })
        .expect(403)

      expect(response.body.success).toBe(false)
    })

    it('非管理员非部门管理员不可创建评价', async () => {
      const response = await request(app)
        .post('/api/evaluations')
        .set('Authorization', 'Bearer ' + otherDeptToken)
        .send({ taskId, targetUserId: memberId, rating: 3, comment: '应被拒' })
        .expect(403)

      expect(response.body.success).toBe(false)
    })
  })
})
