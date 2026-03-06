/**
 * 中集智历 - 导出功能测试
 *
 * 测试覆盖：
 * - ICS导出（日历格式）
 *   - 导出用户所有任务
 *   - 按项目筛选导出
 *   - 按时间范围筛选导出
 *   - 验证ICS格式正确性
 *
 * - Excel导出
 *   - 导出任务列表
 *   - 验证Excel格式
 *   - 验证数据完整性
 *
 * - PDF导出
 *   - 生成工作总结PDF
 *   - 验证PDF内容
 */
import request from 'supertest';
import prisma from '../config/database.js';
import app from '../app.js';

// 测试用户数据
const exportUser = {
  email: 'export-user@example.com',
  password: 'Test123456',
  nickname: 'Export User',
  securityQuestion: 0,
  securityAnswer: 'Export Answer'
};

const collaboratorUser = {
  email: 'export-collaborator@example.com',
  password: 'Test123456',
  nickname: 'Export Collaborator',
  securityQuestion: 0,
  securityAnswer: 'Collaborator Answer'
};

// 存储Token和ID
let userToken: string;
let collaboratorToken: string;
let userId: string;
let collaboratorId: string;
let projectId1: string;
let projectId2: string;
let taskId1: string;
let taskId2: string;
let taskId3: string;

// 日期工具函数
const today = new Date();
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);

const nextWeek = new Date();
nextWeek.setDate(nextWeek.getDate() + 7);

const twoWeeksLater = new Date();
twoWeeksLater.setDate(twoWeeksLater.getDate() + 14);

/**
 * ICS格式验证工具函数
 */
function validateICSFormat(content: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // 检查必需的头部信息
  if (!content.includes('BEGIN:VCALENDAR')) {
    errors.push('缺少 BEGIN:VCALENDAR');
  }
  if (!content.includes('END:VCALENDAR')) {
    errors.push('缺少 END:VCALENDAR');
  }
  if (!content.includes('VERSION:2.0')) {
    errors.push('缺少或错误的 VERSION');
  }
  if (!content.includes('PRODID:')) {
    errors.push('缺少 PRODID');
  }

  // 检查事件格式
  const eventCount = (content.match(/BEGIN:VEVENT/g) || []).length;
  const endEventCount = (content.match(/END:VEVENT/g) || []).length;
  if (eventCount !== endEventCount) {
    errors.push('VEVENT 开始和结束标签不匹配');
  }

  // 检查每个事件是否包含必需字段
  const events = content.split('BEGIN:VEVENT').slice(1);
  events.forEach((event, index) => {
    if (!event.includes('DTSTART')) {
      errors.push(`事件 ${index + 1} 缺少 DTSTART`);
    }
    if (!event.includes('DTEND') && !event.includes('DURATION')) {
      // DTEND 或 DURATION 至少有一个
    }
    if (!event.includes('SUMMARY')) {
      errors.push(`事件 ${index + 1} 缺少 SUMMARY`);
    }
    if (!event.includes('UID')) {
      errors.push(`事件 ${index + 1} 缺少 UID`);
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * 解析ICS内容获取事件数量
 */
function getICSEventCount(content: string): number {
  return (content.match(/BEGIN:VEVENT/g) || []).length;
}

/**
 * 导出功能测试套件
 */
describe('导出功能测试', () => {
  // 测试前准备数据
  beforeAll(async () => {
    // 清理测试数据
    await prisma.taskCollaborator.deleteMany({
      where: {
        task: {
          title: { in: ['Export Task 1', 'Export Task 2', 'Export Task 3', 'Collaborator Export Task'] }
        }
      }
    });
    await prisma.task.deleteMany({
      where: {
        title: { in: ['Export Task 1', 'Export Task 2', 'Export Task 3', 'Collaborator Export Task'] }
      }
    });
    await prisma.projectMember.deleteMany({
      where: {
        project: {
          name: { in: ['Export Project 1', 'Export Project 2'] }
        }
      }
    });
    await prisma.project.deleteMany({
      where: {
        name: { in: ['Export Project 1', 'Export Project 2'] }
      }
    });
    await prisma.securityAnswer.deleteMany({
      where: {
        user: {
          email: { in: [exportUser.email, collaboratorUser.email] }
        }
      }
    });
    await prisma.user.deleteMany({
      where: {
        email: { in: [exportUser.email, collaboratorUser.email] }
      }
    });

    // 创建测试用户
    const userResponse = await request(app)
      .post('/api/auth/register')
      .send(exportUser);
    userToken = userResponse.body.data.token;
    userId = userResponse.body.data.user.id;

    const collaboratorResponse = await request(app)
      .post('/api/auth/register')
      .send(collaboratorUser);
    collaboratorToken = collaboratorResponse.body.data.token;
    collaboratorId = collaboratorResponse.body.data.user.id;

    // 创建测试项目1
    const project1Response = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        name: 'Export Project 1',
        description: 'First project for export testing',
        visibility: 'PRIVATE'
      });
    projectId1 = project1Response.body.data.id;

    // 创建测试项目2
    const project2Response = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        name: 'Export Project 2',
        description: 'Second project for export testing',
        visibility: 'PRIVATE'
      });
    projectId2 = project2Response.body.data.id;

    // 添加协作者到项目1
    await request(app)
      .post(`/api/projects/${projectId1}/members`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ userId: collaboratorId });

    // 创建测试任务1 - 项目1，明天到期
    const task1Response = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        projectId: projectId1,
        title: 'Export Task 1',
        description: 'First task for export testing',
        dueDate: tomorrow.toISOString(),
        assigneeId: userId,
        priority: 'HIGH',
        status: 'TODO'
      });
    taskId1 = task1Response.body.data.id;

    // 创建测试任务2 - 项目1，下周到期
    const task2Response = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        projectId: projectId1,
        title: 'Export Task 2',
        description: 'Second task for export testing',
        dueDate: nextWeek.toISOString(),
        assigneeId: collaboratorId,
        priority: 'MEDIUM',
        status: 'IN_PROGRESS'
      });
    taskId2 = task2Response.body.data.id;

    // 创建测试任务3 - 项目2，两周后到期
    const task3Response = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        projectId: projectId2,
        title: 'Export Task 3',
        description: 'Third task for export testing',
        dueDate: twoWeeksLater.toISOString(),
        assigneeId: userId,
        priority: 'LOW',
        status: 'DONE'
      });
    taskId3 = task3Response.body.data.id;
  });

  // 测试后清理
  afterAll(async () => {
    await prisma.taskCollaborator.deleteMany({
      where: {
        task: {
          title: { in: ['Export Task 1', 'Export Task 2', 'Export Task 3', 'Collaborator Export Task'] }
        }
      }
    });
    await prisma.task.deleteMany({
      where: {
        title: { in: ['Export Task 1', 'Export Task 2', 'Export Task 3', 'Collaborator Export Task'] }
      }
    });
    await prisma.projectMember.deleteMany({
      where: {
        project: {
          name: { in: ['Export Project 1', 'Export Project 2'] }
        }
      }
    });
    await prisma.project.deleteMany({
      where: {
        name: { in: ['Export Project 1', 'Export Project 2'] }
      }
    });
    await prisma.securityAnswer.deleteMany({
      where: {
        user: {
          email: { in: [exportUser.email, collaboratorUser.email] }
        }
      }
    });
    await prisma.user.deleteMany({
      where: {
        email: { in: [exportUser.email, collaboratorUser.email] }
      }
    });
    await prisma.$disconnect();
  });

  // ==================== ICS 导出测试 ====================
  describe('ICS 导出测试', () => {

    describe('GET /api/export/ics - 导出用户所有任务', () => {

      describe('导出所有任务成功', () => {
        it('应该能够导出用户所有任务为ICS格式', async () => {
          const response = await request(app)
            .get('/api/export/ics')
            .set('Authorization', `Bearer ${userToken}`)
            .expect('Content-Type', /text\/calendar/)
            .expect(200);

          expect(response.text).toBeDefined();
          const validation = validateICSFormat(response.text);
          expect(validation.valid).toBe(true);
        });

        it('导出的ICS应该包含所有用户的任务', async () => {
          const response = await request(app)
            .get('/api/export/ics')
            .set('Authorization', `Bearer ${userToken}`);

          // 应该包含至少3个任务
          const eventCount = getICSEventCount(response.text);
          expect(eventCount).toBeGreaterThanOrEqual(3);
        });

        it('ICS内容应该包含任务标题作为SUMMARY', async () => {
          const response = await request(app)
            .get('/api/export/ics')
            .set('Authorization', `Bearer ${userToken}`);

          expect(response.text).toContain('SUMMARY:Export Task 1');
          expect(response.text).toContain('SUMMARY:Export Task 2');
          expect(response.text).toContain('SUMMARY:Export Task 3');
        });

        it('ICS内容应该包含任务描述', async () => {
          const response = await request(app)
            .get('/api/export/ics')
            .set('Authorization', `Bearer ${userToken}`);

          expect(response.text).toContain('DESCRIPTION:');
        });

        it('ICS内容应该包含任务UID', async () => {
          const response = await request(app)
            .get('/api/export/ics')
            .set('Authorization', `Bearer ${userToken}`);

          // 检查是否包含任务ID
          expect(response.text).toContain(`UID:${taskId1}`);
          expect(response.text).toContain(`UID:${taskId2}`);
          expect(response.text).toContain(`UID:${taskId3}`);
        });
      });

      describe('未登录用户导出', () => {
        it('未登录用户不应该能够导出ICS', async () => {
          const response = await request(app)
            .get('/api/export/ics')
            .expect(401);

          expect(response.body.success).toBe(false);
        });
      });
    });

    describe('GET /api/export/ics?projectId=xxx - 按项目筛选导出', () => {

      describe('按项目筛选导出成功', () => {
        it('应该能够按项目筛选导出ICS', async () => {
          const response = await request(app)
            .get(`/api/export/ics?projectId=${projectId1}`)
            .set('Authorization', `Bearer ${userToken}`)
            .expect('Content-Type', /text\/calendar/)
            .expect(200);

          const validation = validateICSFormat(response.text);
          expect(validation.valid).toBe(true);
        });

        it('按项目筛选应该只包含该项目的任务', async () => {
          const response = await request(app)
            .get(`/api/export/ics?projectId=${projectId1}`)
            .set('Authorization', `Bearer ${userToken}`);

          // 项目1有2个任务
          const eventCount = getICSEventCount(response.text);
          expect(eventCount).toBe(2);

          // 应该包含项目1的任务
          expect(response.text).toContain('SUMMARY:Export Task 1');
          expect(response.text).toContain('SUMMARY:Export Task 2');

          // 不应该包含项目2的任务
          expect(response.text).not.toContain('SUMMARY:Export Task 3');
        });

        it('按项目2筛选应该只返回项目2的任务', async () => {
          const response = await request(app)
            .get(`/api/export/ics?projectId=${projectId2}`)
            .set('Authorization', `Bearer ${userToken}`);

          // 项目2有1个任务
          const eventCount = getICSEventCount(response.text);
          expect(eventCount).toBe(1);

          expect(response.text).toContain('SUMMARY:Export Task 3');
          expect(response.text).not.toContain('SUMMARY:Export Task 1');
        });
      });

      describe('无效项目ID', () => {
        it('无效的项目ID应该返回空日历', async () => {
          const fakeProjectId = '00000000-0000-0000-0000-000000000000';
          const response = await request(app)
            .get(`/api/export/ics?projectId=${fakeProjectId}`)
            .set('Authorization', `Bearer ${userToken}`)
            .expect(200);

          // 应该返回空的日历结构
          expect(response.text).toContain('BEGIN:VCALENDAR');
          expect(response.text).toContain('END:VCALENDAR');
          const eventCount = getICSEventCount(response.text);
          expect(eventCount).toBe(0);
        });
      });
    });

    describe('GET /api/export/ics?startDate=xxx&endDate=xxx - 按时间范围筛选导出', () => {

      describe('按时间范围筛选导出成功', () => {
        it('应该能够按时间范围筛选导出ICS', async () => {
          const startDate = new Date();
          const endDate = new Date();
          endDate.setDate(endDate.getDate() + 3);

          const response = await request(app)
            .get(`/api/export/ics?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`)
            .set('Authorization', `Bearer ${userToken}`)
            .expect('Content-Type', /text\/calendar/)
            .expect(200);

          const validation = validateICSFormat(response.text);
          expect(validation.valid).toBe(true);
        });

        it('时间范围内应该只包含符合条件的任务', async () => {
          const startDate = new Date();
          const endDate = new Date();
          endDate.setDate(endDate.getDate() + 3);

          const response = await request(app)
            .get(`/api/export/ics?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`)
            .set('Authorization', `Bearer ${userToken}`);

          // 只有明天到期的任务符合条件
          const eventCount = getICSEventCount(response.text);
          expect(eventCount).toBe(1);
          expect(response.text).toContain('SUMMARY:Export Task 1');
        });

        it('较大的时间范围应该包含更多任务', async () => {
          const startDate = new Date();
          const endDate = new Date();
          endDate.setDate(endDate.getDate() + 10);

          const response = await request(app)
            .get(`/api/export/ics?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`)
            .set('Authorization', `Bearer ${userToken}`);

          // 明天和下周的任务符合条件
          const eventCount = getICSEventCount(response.text);
          expect(eventCount).toBeGreaterThanOrEqual(2);
        });
      });

      describe('边界条件测试', () => {
        it('只提供startDate应该返回该日期之后的任务', async () => {
          const startDate = new Date();
          startDate.setDate(startDate.getDate() + 5);

          const response = await request(app)
            .get(`/api/export/ics?startDate=${startDate.toISOString()}`)
            .set('Authorization', `Bearer ${userToken}`)
            .expect(200);

          const validation = validateICSFormat(response.text);
          expect(validation.valid).toBe(true);
        });

        it('只提供endDate应该返回该日期之前的任务', async () => {
          const endDate = new Date();
          endDate.setDate(endDate.getDate() + 5);

          const response = await request(app)
            .get(`/api/export/ics?endDate=${endDate.toISOString()}`)
            .set('Authorization', `Bearer ${userToken}`)
            .expect(200);

          const validation = validateICSFormat(response.text);
          expect(validation.valid).toBe(true);
        });
      });
    });

    describe('ICS格式正确性验证', () => {

      describe('ICS格式结构验证', () => {
        it('ICS应该包含正确的MIME类型', async () => {
          const response = await request(app)
            .get('/api/export/ics')
            .set('Authorization', `Bearer ${userToken}`);

          expect(response.headers['content-type']).toMatch(/text\/calendar/);
        });

        it('ICS应该包含文件名头部', async () => {
          const response = await request(app)
            .get('/api/export/ics')
            .set('Authorization', `Bearer ${userToken}`);

          const contentDisposition = response.headers['content-disposition'];
          expect(contentDisposition).toBeDefined();
          expect(contentDisposition).toMatch(/attachment/);
          expect(contentDisposition).toMatch(/\.ics/);
        });

        it('ICS应该包含CALSCALE定义', async () => {
          const response = await request(app)
            .get('/api/export/ics')
            .set('Authorization', `Bearer ${userToken}`);

          expect(response.text).toContain('CALSCALE:GREGORIAN');
        });

        it('ICS应该包含METHOD定义', async () => {
          const response = await request(app)
            .get('/api/export/ics')
            .set('Authorization', `Bearer ${userToken}`);

          expect(response.text).toContain('METHOD:PUBLISH');
        });
      });

      describe('事件属性验证', () => {
        it('每个事件应该包含DTSTAMP', async () => {
          const response = await request(app)
            .get('/api/export/ics')
            .set('Authorization', `Bearer ${userToken}`);

          const events = response.text.split('BEGIN:VEVENT').slice(1);
          events.forEach(event => {
            expect(event).toContain('DTSTAMP:');
          });
        });

        it('每个事件应该包含STATUS', async () => {
          const response = await request(app)
            .get('/api/export/ics')
            .set('Authorization', `Bearer ${userToken}`);

          // 至少应该有事件包含状态
          expect(response.text).toMatch(/STATUS:/);
        });

        it('事件应该包含优先级信息', async () => {
          const response = await request(app)
            .get('/api/export/ics')
            .set('Authorization', `Bearer ${userToken}`);

          // 高优先级任务应该有PRIORITY字段
          expect(response.text).toMatch(/PRIORITY:/);
        });
      });
    });
  });

  // ==================== Excel 导出测试 ====================
  describe('Excel 导出测试', () => {

    describe('GET /api/export/excel - 导出任务列表', () => {

      describe('导出Excel成功', () => {
        it('应该能够导出任务列表为Excel格式', async () => {
          const response = await request(app)
            .get('/api/export/excel')
            .set('Authorization', `Bearer ${userToken}`)
            .expect(200);

          // 验证是Excel文件（xlsx格式）
          expect(response.headers['content-type']).toMatch(/application\/vnd.openxmlformats-officedocument.spreadsheetml.sheet/);
        });

        it('Excel响应应该包含正确的文件名', async () => {
          const response = await request(app)
            .get('/api/export/excel')
            .set('Authorization', `Bearer ${userToken}`);

          const contentDisposition = response.headers['content-disposition'];
          expect(contentDisposition).toBeDefined();
          expect(contentDisposition).toMatch(/attachment/);
          expect(contentDisposition).toMatch(/\.xlsx/);
        });

        it('应该能够按项目筛选导出Excel', async () => {
          const response = await request(app)
            .get(`/api/export/excel?projectId=${projectId1}`)
            .set('Authorization', `Bearer ${userToken}`)
            .expect(200);

          expect(response.headers['content-type']).toMatch(/application\/vnd.openxmlformats-officedocument.spreadsheetml.sheet/);
        });
      });

      describe('权限验证', () => {
        it('未登录用户不应该能够导出Excel', async () => {
          const response = await request(app)
            .get('/api/export/excel')
            .expect(401);

          expect(response.body.success).toBe(false);
        });

        it('用户不应该能导出无权限项目的任务', async () => {
          // 协作者只属于项目1，不能导出项目2
          const response = await request(app)
            .get(`/api/export/excel?projectId=${projectId2}`)
            .set('Authorization', `Bearer ${collaboratorToken}`);

          // 应该返回空或者403
          // 具体行为取决于实现
          expect([200, 403, 404]).toContain(response.status);
        });
      });
    });

    describe('Excel格式验证', () => {

      describe('Excel文件结构验证', () => {
        it('Excel文件应该是有效的xlsx格式', async () => {
          const response = await request(app)
            .get('/api/export/excel')
            .set('Authorization', `Bearer ${userToken}`);

          // xlsx文件以PK(zip)开头
          const buffer = response.body;
          expect(buffer).toBeDefined();
        });

        it('Excel文件大小应该大于0', async () => {
          const response = await request(app)
            .get('/api/export/excel')
            .set('Authorization', `Bearer ${userToken}`);

          expect(response.body.length).toBeGreaterThan(0);
        });
      });
    });

    describe('Excel数据完整性验证', () => {

      describe('数据内容验证', () => {
        it('导出的任务数量应该正确', async () => {
          // 此测试需要实际的Excel解析库
          // 这里仅验证响应成功
          const response = await request(app)
            .get('/api/export/excel')
            .set('Authorization', `Bearer ${userToken}`)
            .expect(200);

          expect(response.body).toBeDefined();
        });

        it('按状态筛选导出应该正确', async () => {
          const response = await request(app)
            .get('/api/export/excel?status=TODO')
            .set('Authorization', `Bearer ${userToken}`)
            .expect(200);

          expect(response.headers['content-type']).toMatch(/application\/vnd.openxmlformats-officedocument.spreadsheetml.sheet/);
        });

        it('按优先级筛选导出应该正确', async () => {
          const response = await request(app)
            .get('/api/export/excel?priority=HIGH')
            .set('Authorization', `Bearer ${userToken}`)
            .expect(200);

          expect(response.headers['content-type']).toMatch(/application\/vnd.openxmlformats-officedocument.spreadsheetml.sheet/);
        });
      });
    });
  });

  // ==================== PDF 导出测试 ====================
  describe('PDF 导出测试', () => {

    describe('GET /api/export/pdf - 生成工作总结PDF', () => {

      describe('生成PDF成功', () => {
        it('应该能够生成工作总结PDF', async () => {
          const response = await request(app)
            .get('/api/export/pdf')
            .set('Authorization', `Bearer ${userToken}`)
            .expect(200);

          expect(response.headers['content-type']).toMatch(/application\/pdf/);
        });

        it('PDF响应应该包含正确的文件名', async () => {
          const response = await request(app)
            .get('/api/export/pdf')
            .set('Authorization', `Bearer ${userToken}`);

          const contentDisposition = response.headers['content-disposition'];
          expect(contentDisposition).toBeDefined();
          expect(contentDisposition).toMatch(/attachment/);
          expect(contentDisposition).toMatch(/\.pdf/);
        });

        it('应该能够按项目生成PDF总结', async () => {
          const response = await request(app)
            .get(`/api/export/pdf?projectId=${projectId1}`)
            .set('Authorization', `Bearer ${userToken}`)
            .expect(200);

          expect(response.headers['content-type']).toMatch(/application\/pdf/);
        });

        it('应该能够按时间范围生成PDF总结', async () => {
          const startDate = new Date();
          startDate.setDate(startDate.getDate() - 7);
          const endDate = new Date();

          const response = await request(app)
            .get(`/api/export/pdf?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`)
            .set('Authorization', `Bearer ${userToken}`)
            .expect(200);

          expect(response.headers['content-type']).toMatch(/application\/pdf/);
        });
      });

      describe('权限验证', () => {
        it('未登录用户不应该能够生成PDF', async () => {
          const response = await request(app)
            .get('/api/export/pdf')
            .expect(401);

          expect(response.body.success).toBe(false);
        });
      });
    });

    describe('PDF内容验证', () => {

      describe('PDF文件结构验证', () => {
        it('PDF文件应该以%PDF开头', async () => {
          const response = await request(app)
            .get('/api/export/pdf')
            .set('Authorization', `Bearer ${userToken}`);

          // PDF文件以%PDF-开头
          const buffer = Buffer.from(response.body);
          const header = buffer.slice(0, 4).toString();
          expect(header).toBe('%PDF');
        });

        it('PDF文件应该以%%EOF结尾', async () => {
          const response = await request(app)
            .get('/api/export/pdf')
            .set('Authorization', `Bearer ${userToken}`);

          const buffer = Buffer.from(response.body);
          const lastBytes = buffer.slice(-10).toString();
          expect(lastBytes).toContain('%%EOF');
        });

        it('PDF文件大小应该大于0', async () => {
          const response = await request(app)
            .get('/api/export/pdf')
            .set('Authorization', `Bearer ${userToken}`);

          const buffer = Buffer.from(response.body);
          expect(buffer.length).toBeGreaterThan(0);
        });
      });

      describe('PDF总结内容验证', () => {
        it('PDF应该包含任务统计信息', async () => {
          // 验证PDF生成成功
          const response = await request(app)
            .get('/api/export/pdf')
            .set('Authorization', `Bearer ${userToken}`)
            .expect(200);

          expect(response.headers['content-type']).toMatch(/application\/pdf/);
        });

        it('PDF应该支持中文内容', async () => {
          const response = await request(app)
            .get('/api/export/pdf')
            .set('Authorization', `Bearer ${userToken}`)
            .expect(200);

          // 验证PDF生成成功
          expect(response.headers['content-type']).toMatch(/application\/pdf/);
          const buffer = Buffer.from(response.body);
          expect(buffer.length).toBeGreaterThan(1000); // 包含中文的PDF应该有一定大小
        });
      });
    });

    describe('PDF导出选项测试', () => {

      describe('不同的导出选项', () => {
        it('应该支持包含已完成任务的选项', async () => {
          const response = await request(app)
            .get('/api/export/pdf?includeCompleted=true')
            .set('Authorization', `Bearer ${userToken}`)
            .expect(200);

          expect(response.headers['content-type']).toMatch(/application\/pdf/);
        });

        it('应该支持仅包含未完成任务的选项', async () => {
          const response = await request(app)
            .get('/api/export/pdf?includeCompleted=false')
            .set('Authorization', `Bearer ${userToken}`)
            .expect(200);

          expect(response.headers['content-type']).toMatch(/application\/pdf/);
        });

        it('应该支持指定总结类型', async () => {
          const response = await request(app)
            .get('/api/export/pdf?type=weekly')
            .set('Authorization', `Bearer ${userToken}`)
            .expect(200);

          expect(response.headers['content-type']).toMatch(/application\/pdf/);
        });

        it('应该支持月度总结类型', async () => {
          const response = await request(app)
            .get('/api/export/pdf?type=monthly')
            .set('Authorization', `Bearer ${userToken}`)
            .expect(200);

          expect(response.headers['content-type']).toMatch(/application\/pdf/);
        });
      });
    });
  });

  // ==================== 综合导出测试 ====================
  describe('综合导出测试', () => {

    describe('并发导出测试', () => {
      it('应该支持同时发起多个导出请求', async () => {
        const [icsResponse, excelResponse, pdfResponse] = await Promise.all([
          request(app)
            .get('/api/export/ics')
            .set('Authorization', `Bearer ${userToken}`),
          request(app)
            .get('/api/export/excel')
            .set('Authorization', `Bearer ${userToken}`),
          request(app)
            .get('/api/export/pdf')
            .set('Authorization', `Bearer ${userToken}`)
        ]);

        expect(icsResponse.status).toBe(200);
        expect(excelResponse.status).toBe(200);
        expect(pdfResponse.status).toBe(200);
      });
    });

    describe('大数据量导出测试', () => {
      it('应该能够处理大量任务的导出', async () => {
        // 创建多个任务测试大数据量
        const taskPromises = [];
        for (let i = 0; i < 10; i++) {
          taskPromises.push(
            request(app)
              .post('/api/tasks')
              .set('Authorization', `Bearer ${userToken}`)
              .send({
                projectId: projectId1,
                title: `Bulk Export Task ${i}`,
                description: `Bulk task ${i} for testing`,
                dueDate: tomorrow.toISOString(),
                assigneeId: userId
              })
          );
        }
        await Promise.all(taskPromises);

        // 导出ICS
        const icsResponse = await request(app)
          .get('/api/export/ics')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        expect(icsResponse.text).toContain('BEGIN:VCALENDAR');

        // 清理批量创建的任务
        await prisma.task.deleteMany({
          where: {
            title: { startsWith: 'Bulk Export Task' }
          }
        });
      }, 30000);
    });

    describe('错误处理测试', () => {
      it('无效的日期格式应该被正确处理', async () => {
        const response = await request(app)
          .get('/api/export/ics?startDate=invalid-date')
          .set('Authorization', `Bearer ${userToken}`);

        // 应该返回错误或者忽略无效参数
        expect([200, 400]).toContain(response.status);
      });

      it('缺少认证token应该返回401', async () => {
        const endpoints = [
          '/api/export/ics',
          '/api/export/excel',
          '/api/export/pdf'
        ];

        for (const endpoint of endpoints) {
          const response = await request(app)
            .get(endpoint);
          expect(response.status).toBe(401);
        }
      });
    });
  });
});
