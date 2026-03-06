/**
 * 中集智历 - 任务模块测试
 *
 * 测试覆盖：
 * - 任务创建
 * - 获取任务列表
 * - 更新任务状态
 * - 任务指派
 * - 删除任务
 */
import request from 'supertest';
import prisma from '../config/database.js';
import app from '../app.js';
// 测试用户数据
const creatorUser = {
    email: 'task-creator@example.com',
    password: 'Test123456',
    nickname: 'Task Creator',
    securityQuestion: 0,
    securityAnswer: 'Creator Answer'
};
const assigneeUser = {
    email: 'task-assignee@example.com',
    password: 'Test123456',
    nickname: 'Task Assignee',
    securityQuestion: 0,
    securityAnswer: 'Assignee Answer'
};
const collaboratorUser = {
    email: 'task-collaborator@example.com',
    password: 'Test123456',
    nickname: 'Task Collaborator',
    securityQuestion: 0,
    securityAnswer: 'Collaborator Answer'
};
const outsiderUser = {
    email: 'task-outsider@example.com',
    password: 'Test123456',
    nickname: 'Task Outsider',
    securityQuestion: 0,
    securityAnswer: 'Outsider Answer'
};
// 存储Token和ID
let creatorToken;
let assigneeToken;
let _collaboratorToken;
let outsiderToken;
let creatorId;
let assigneeId;
let collaboratorId;
let _outsiderId;
let projectId;
let taskId;
// 日期工具函数
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const nextWeek = new Date();
nextWeek.setDate(nextWeek.getDate() + 7);
/**
 * 任务模块测试套件
 */
describe('任务模块测试', () => {
    // 测试前准备数据
    beforeAll(async () => {
        // 清理测试数据
        await prisma.taskCollaborator.deleteMany({
            where: {
                task: {
                    title: { in: ['Test Task', 'Update Status Task', 'Delete Test Task', 'Collaborator Task'] }
                }
            }
        });
        await prisma.task.deleteMany({
            where: {
                title: { in: ['Test Task', 'Update Status Task', 'Delete Test Task', 'Collaborator Task'] }
            }
        });
        await prisma.projectMember.deleteMany({
            where: {
                project: {
                    name: 'Task Test Project'
                }
            }
        });
        await prisma.project.deleteMany({
            where: {
                name: 'Task Test Project'
            }
        });
        await prisma.securityAnswer.deleteMany({
            where: {
                user: {
                    email: { in: [creatorUser.email, assigneeUser.email, collaboratorUser.email, outsiderUser.email] }
                }
            }
        });
        await prisma.user.deleteMany({
            where: {
                email: { in: [creatorUser.email, assigneeUser.email, collaboratorUser.email, outsiderUser.email] }
            }
        });
        // 创建测试用户
        const creatorResponse = await request(app)
            .post('/api/auth/register')
            .send(creatorUser);
        creatorToken = creatorResponse.body.data.token;
        creatorId = creatorResponse.body.data.user.id;
        const assigneeResponse = await request(app)
            .post('/api/auth/register')
            .send(assigneeUser);
        assigneeToken = assigneeResponse.body.data.token;
        assigneeId = assigneeResponse.body.data.user.id;
        const collaboratorResponse = await request(app)
            .post('/api/auth/register')
            .send(collaboratorUser);
        collaboratorToken = collaboratorResponse.body.data.token;
        collaboratorId = collaboratorResponse.body.data.user.id;
        const outsiderResponse = await request(app)
            .post('/api/auth/register')
            .send(outsiderUser);
        outsiderToken = outsiderResponse.body.data.token;
        outsiderId = outsiderResponse.body.data.user.id;
        // 创建测试项目并添加成员
        const projectResponse = await request(app)
            .post('/api/projects')
            .set('Authorization', `Bearer ${creatorToken}`)
            .send({
            name: 'Task Test Project',
            description: 'Project for task testing',
            visibility: 'PUBLIC'
        });
        projectId = projectResponse.body.data.id;
        // 添加成员到项目
        await request(app)
            .post(`/api/projects/${projectId}/members`)
            .set('Authorization', `Bearer ${creatorToken}`)
            .send({ userId: assigneeId });
        await request(app)
            .post(`/api/projects/${projectId}/members`)
            .set('Authorization', `Bearer ${creatorToken}`)
            .send({ userId: collaboratorId });
    });
    // 测试后清理
    afterAll(async () => {
        await prisma.taskCollaborator.deleteMany({
            where: {
                task: {
                    title: { in: ['Test Task', 'Update Status Task', 'Delete Test Task', 'Collaborator Task'] }
                }
            }
        });
        await prisma.task.deleteMany({
            where: {
                title: { in: ['Test Task', 'Update Status Task', 'Delete Test Task', 'Collaborator Task'] }
            }
        });
        await prisma.projectMember.deleteMany({
            where: {
                project: {
                    name: 'Task Test Project'
                }
            }
        });
        await prisma.project.deleteMany({
            where: {
                name: 'Task Test Project'
            }
        });
        await prisma.securityAnswer.deleteMany({
            where: {
                user: {
                    email: { in: [creatorUser.email, assigneeUser.email, collaboratorUser.email, outsiderUser.email] }
                }
            }
        });
        await prisma.user.deleteMany({
            where: {
                email: { in: [creatorUser.email, assigneeUser.email, collaboratorUser.email, outsiderUser.email] }
            }
        });
        await prisma.$disconnect();
    });
    /**
     * 任务创建测试
     */
    describe('POST /api/tasks - 任务创建', () => {
        describe('创建任务成功', () => {
            it('项目成员应该能够创建任务', async () => {
                const response = await request(app)
                    .post('/api/tasks')
                    .set('Authorization', `Bearer ${creatorToken}`)
                    .send({
                    projectId,
                    title: 'Test Task',
                    description: 'A task for testing',
                    dueDate: tomorrow.toISOString(),
                    assigneeId: assigneeId,
                    priority: 'HIGH'
                })
                    .expect('Content-Type', /json/)
                    .expect(201);
                expect(response.body.success).toBe(true);
                expect(response.body.data).toHaveProperty('id');
                expect(response.body.data.title).toBe('Test Task');
                expect(response.body.data.status).toBe('TODO');
                expect(response.body.data.priority).toBe('HIGH');
                expect(response.body.data.assigneeId).toBe(assigneeId);
                taskId = response.body.data.id;
            });
            it('创建的任务应该包含项目信息', async () => {
                const response = await request(app)
                    .get(`/api/tasks/${taskId}`)
                    .set('Authorization', `Bearer ${creatorToken}`);
                expect(response.body.data.project).toBeDefined();
                expect(response.body.data.project.id).toBe(projectId);
            });
            it('创建的任务应该包含负责人信息', async () => {
                const response = await request(app)
                    .get(`/api/tasks/${taskId}`)
                    .set('Authorization', `Bearer ${creatorToken}`);
                expect(response.body.data.assignee).toBeDefined();
                expect(response.body.data.assignee.id).toBe(assigneeId);
                expect(response.body.data.assignee).toHaveProperty('nickname');
            });
        });
        describe('带协作者创建任务', () => {
            it('应该能够创建带协作者的任务', async () => {
                const response = await request(app)
                    .post('/api/tasks')
                    .set('Authorization', `Bearer ${creatorToken}`)
                    .send({
                    projectId,
                    title: 'Collaborator Task',
                    description: 'Task with collaborators',
                    dueDate: nextWeek.toISOString(),
                    assigneeId: assigneeId,
                    collaboratorIds: [collaboratorId]
                })
                    .expect(201);
                expect(response.body.success).toBe(true);
                // 验证协作者已添加
                const taskDetail = await request(app)
                    .get(`/api/tasks/${response.body.data.id}`)
                    .set('Authorization', `Bearer ${creatorToken}`);
                expect(taskDetail.body.data.collaborators).toHaveLength(1);
                expect(taskDetail.body.data.collaborators[0].userId).toBe(collaboratorId);
            });
        });
        describe('任务创建验证', () => {
            it('应该拒绝空任务标题', async () => {
                const response = await request(app)
                    .post('/api/tasks')
                    .set('Authorization', `Bearer ${creatorToken}`)
                    .send({
                    projectId,
                    title: '',
                    dueDate: tomorrow.toISOString(),
                    assigneeId: assigneeId
                })
                    .expect(400);
                expect(response.body.success).toBe(false);
            });
            it('应该拒绝无效的截止日期', async () => {
                const response = await request(app)
                    .post('/api/tasks')
                    .set('Authorization', `Bearer ${creatorToken}`)
                    .send({
                    projectId,
                    title: 'Invalid Date Task',
                    dueDate: 'invalid-date',
                    assigneeId: assigneeId
                })
                    .expect(400);
                expect(response.body.success).toBe(false);
            });
            it('应该拒绝空的项目ID', async () => {
                const response = await request(app)
                    .post('/api/tasks')
                    .set('Authorization', `Bearer ${creatorToken}`)
                    .send({
                    projectId: '',
                    title: 'No Project Task',
                    dueDate: tomorrow.toISOString(),
                    assigneeId: assigneeId
                })
                    .expect(400);
                expect(response.body.success).toBe(false);
            });
            it('应该拒绝空的负责人ID', async () => {
                const response = await request(app)
                    .post('/api/tasks')
                    .set('Authorization', `Bearer ${creatorToken}`)
                    .send({
                    projectId,
                    title: 'No Assignee Task',
                    dueDate: tomorrow.toISOString(),
                    assigneeId: ''
                })
                    .expect(400);
                expect(response.body.success).toBe(false);
            });
            it('非项目成员不应该能够创建任务', async () => {
                const response = await request(app)
                    .post('/api/tasks')
                    .set('Authorization', `Bearer ${outsiderToken}`)
                    .send({
                    projectId,
                    title: 'Outsider Task',
                    dueDate: tomorrow.toISOString(),
                    assigneeId: assigneeId
                })
                    .expect(403);
                expect(response.body.success).toBe(false);
            });
            it('未登录用户不应该能够创建任务', async () => {
                const response = await request(app)
                    .post('/api/tasks')
                    .send({
                    projectId,
                    title: 'Unauthorized Task',
                    dueDate: tomorrow.toISOString(),
                    assigneeId: assigneeId
                })
                    .expect(401);
                expect(response.body.success).toBe(false);
            });
        });
    });
    /**
     * 获取任务列表测试
     */
    describe('GET /api/tasks - 获取任务列表', () => {
        describe('获取任务列表成功', () => {
            it('应该返回用户有权限的任务列表', async () => {
                const response = await request(app)
                    .get('/api/tasks')
                    .set('Authorization', `Bearer ${creatorToken}`)
                    .expect(200);
                expect(response.body.success).toBe(true);
                expect(Array.isArray(response.body.data)).toBe(true);
                expect(response.body.data.length).toBeGreaterThanOrEqual(1);
            });
            it('任务列表应该包含基本信息', async () => {
                const response = await request(app)
                    .get('/api/tasks')
                    .set('Authorization', `Bearer ${creatorToken}`);
                const task = response.body.data.find((t) => t.id === taskId);
                expect(task).toBeDefined();
                expect(task).toHaveProperty('id');
                expect(task).toHaveProperty('title');
                expect(task).toHaveProperty('status');
                expect(task).toHaveProperty('project');
                expect(task).toHaveProperty('assignee');
            });
        });
        describe('按项目筛选任务', () => {
            it('应该能够按项目ID筛选任务', async () => {
                const response = await request(app)
                    .get(`/api/tasks?projectId=${projectId}`)
                    .set('Authorization', `Bearer ${creatorToken}`)
                    .expect(200);
                expect(response.body.success).toBe(true);
                response.body.data.forEach((task) => {
                    expect(task.projectId).toBe(projectId);
                });
            });
        });
        describe('按负责人筛选任务', () => {
            it('应该能够按负责人筛选任务', async () => {
                const response = await request(app)
                    .get(`/api/tasks?assigneeId=${assigneeId}`)
                    .set('Authorization', `Bearer ${creatorToken}`)
                    .expect(200);
                expect(response.body.success).toBe(true);
                response.body.data.forEach((task) => {
                    expect(task.assigneeId).toBe(assigneeId);
                });
            });
        });
        describe('按状态筛选任务', () => {
            it('应该能够按状态筛选任务', async () => {
                const response = await request(app)
                    .get('/api/tasks?status=TODO')
                    .set('Authorization', `Bearer ${creatorToken}`)
                    .expect(200);
                expect(response.body.success).toBe(true);
                response.body.data.forEach((task) => {
                    expect(task.status).toBe('TODO');
                });
            });
        });
        describe('按日期范围筛选任务', () => {
            it('应该能够按日期范围筛选任务', async () => {
                const startDate = new Date();
                const endDate = new Date();
                endDate.setDate(endDate.getDate() + 14);
                const response = await request(app)
                    .get(`/api/tasks?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`)
                    .set('Authorization', `Bearer ${creatorToken}`)
                    .expect(200);
                expect(response.body.success).toBe(true);
            });
        });
        describe('权限验证', () => {
            it('非项目成员不应该看到该项目的任务', async () => {
                const response = await request(app)
                    .get(`/api/tasks?projectId=${projectId}`)
                    .set('Authorization', `Bearer ${outsiderToken}`)
                    .expect(200);
                expect(response.body.data).toHaveLength(0);
            });
            it('任务负责人应该能够看到分配给自己的任务', async () => {
                const response = await request(app)
                    .get('/api/tasks')
                    .set('Authorization', `Bearer ${assigneeToken}`)
                    .expect(200);
                const assignedTask = response.body.data.find((t) => t.id === taskId);
                expect(assignedTask).toBeDefined();
            });
        });
    });
    /**
     * 获取任务详情测试
     */
    describe('GET /api/tasks/:id - 获取任务详情', () => {
        describe('获取任务详情成功', () => {
            it('应该返回任务详细信息', async () => {
                const response = await request(app)
                    .get(`/api/tasks/${taskId}`)
                    .set('Authorization', `Bearer ${creatorToken}`)
                    .expect(200);
                expect(response.body.success).toBe(true);
                expect(response.body.data.id).toBe(taskId);
                expect(response.body.data.title).toBe('Test Task');
            });
            it('任务详情应该包含完整信息', async () => {
                const response = await request(app)
                    .get(`/api/tasks/${taskId}`)
                    .set('Authorization', `Bearer ${creatorToken}`);
                expect(response.body.data).toHaveProperty('project');
                expect(response.body.data).toHaveProperty('assignee');
                expect(response.body.data).toHaveProperty('creator');
                expect(response.body.data).toHaveProperty('collaborators');
                expect(response.body.data).toHaveProperty('comments');
                expect(response.body.data).toHaveProperty('attachments');
            });
        });
        describe('任务不存在的情况', () => {
            it('应该返回404当任务不存在时', async () => {
                const fakeId = '00000000-0000-0000-0000-000000000000';
                const response = await request(app)
                    .get(`/api/tasks/${fakeId}`)
                    .set('Authorization', `Bearer ${creatorToken}`)
                    .expect(404);
                expect(response.body.success).toBe(false);
                expect(response.body.message).toContain('不存在');
            });
        });
    });
    /**
     * 更新任务状态测试
     */
    describe('PUT /api/tasks/:id - 更新任务', () => {
        describe('更新任务状态', () => {
            it('应该能够更新任务状态为进行中', async () => {
                const response = await request(app)
                    .put(`/api/tasks/${taskId}`)
                    .set('Authorization', `Bearer ${creatorToken}`)
                    .send({
                    status: 'IN_PROGRESS'
                })
                    .expect(200);
                expect(response.body.success).toBe(true);
                expect(response.body.data.status).toBe('IN_PROGRESS');
            });
            it('应该能够更新任务状态为已完成', async () => {
                const response = await request(app)
                    .put(`/api/tasks/${taskId}`)
                    .set('Authorization', `Bearer ${creatorToken}`)
                    .send({
                    status: 'DONE'
                })
                    .expect(200);
                expect(response.body.success).toBe(true);
                expect(response.body.data.status).toBe('DONE');
            });
            it('应该能够更新任务状态为已取消', async () => {
                // 先创建一个新任务用于取消测试
                const createResponse = await request(app)
                    .post('/api/tasks')
                    .set('Authorization', `Bearer ${creatorToken}`)
                    .send({
                    projectId,
                    title: 'Update Status Task',
                    dueDate: tomorrow.toISOString(),
                    assigneeId: assigneeId
                });
                const newTaskId = createResponse.body.data.id;
                const response = await request(app)
                    .put(`/api/tasks/${newTaskId}`)
                    .set('Authorization', `Bearer ${creatorToken}`)
                    .send({
                    status: 'CANCELLED'
                })
                    .expect(200);
                expect(response.body.success).toBe(true);
                expect(response.body.data.status).toBe('CANCELLED');
            });
        });
        describe('更新其他任务属性', () => {
            it('应该能够更新任务标题', async () => {
                const response = await request(app)
                    .put(`/api/tasks/${taskId}`)
                    .set('Authorization', `Bearer ${creatorToken}`)
                    .send({
                    title: 'Updated Task Title'
                })
                    .expect(200);
                expect(response.body.success).toBe(true);
                expect(response.body.data.title).toBe('Updated Task Title');
            });
            it('应该能够更新任务描述', async () => {
                const response = await request(app)
                    .put(`/api/tasks/${taskId}`)
                    .set('Authorization', `Bearer ${creatorToken}`)
                    .send({
                    description: 'Updated task description'
                })
                    .expect(200);
                expect(response.body.success).toBe(true);
                expect(response.body.data.description).toBe('Updated task description');
            });
            it('应该能够更新任务优先级', async () => {
                const response = await request(app)
                    .put(`/api/tasks/${taskId}`)
                    .set('Authorization', `Bearer ${creatorToken}`)
                    .send({
                    priority: 'LOW'
                })
                    .expect(200);
                expect(response.body.success).toBe(true);
                expect(response.body.data.priority).toBe('LOW');
            });
            it('应该能够更新截止日期', async () => {
                const newDueDate = new Date();
                newDueDate.setDate(newDueDate.getDate() + 14);
                const response = await request(app)
                    .put(`/api/tasks/${taskId}`)
                    .set('Authorization', `Bearer ${creatorToken}`)
                    .send({
                    dueDate: newDueDate.toISOString()
                })
                    .expect(200);
                expect(response.body.success).toBe(true);
            });
        });
        describe('更新任务验证', () => {
            it('应该拒绝无效的状态值', async () => {
                const response = await request(app)
                    .put(`/api/tasks/${taskId}`)
                    .set('Authorization', `Bearer ${creatorToken}`)
                    .send({
                    status: 'INVALID_STATUS'
                })
                    .expect(400);
                expect(response.body.success).toBe(false);
            });
            it('应该拒绝无效的优先级值', async () => {
                const response = await request(app)
                    .put(`/api/tasks/${taskId}`)
                    .set('Authorization', `Bearer ${creatorToken}`)
                    .send({
                    priority: 'INVALID_PRIORITY'
                })
                    .expect(400);
                expect(response.body.success).toBe(false);
            });
            it('非项目成员不应该能够更新任务', async () => {
                const response = await request(app)
                    .put(`/api/tasks/${taskId}`)
                    .set('Authorization', `Bearer ${outsiderToken}`)
                    .send({
                    title: 'Hacked Title'
                })
                    .expect(403);
                expect(response.body.success).toBe(false);
            });
            it('更新不存在的任务应该返回404', async () => {
                const fakeId = '00000000-0000-0000-0000-000000000000';
                const response = await request(app)
                    .put(`/api/tasks/${fakeId}`)
                    .set('Authorization', `Bearer ${creatorToken}`)
                    .send({
                    title: 'Non-existent Task'
                })
                    .expect(404);
                expect(response.body.success).toBe(false);
            });
        });
    });
    /**
     * 任务指派测试
     */
    describe('任务指派测试', () => {
        describe('更改任务负责人', () => {
            it('应该能够更改任务负责人', async () => {
                const response = await request(app)
                    .put(`/api/tasks/${taskId}`)
                    .set('Authorization', `Bearer ${creatorToken}`)
                    .send({
                    assigneeId: creatorId
                })
                    .expect(200);
                expect(response.body.success).toBe(true);
                expect(response.body.data.assigneeId).toBe(creatorId);
            });
        });
        describe('添加协作者', () => {
            it('应该能够添加任务协作者', async () => {
                const response = await request(app)
                    .post(`/api/tasks/${taskId}/collaborators`)
                    .set('Authorization', `Bearer ${creatorToken}`)
                    .send({
                    userId: collaboratorId
                })
                    .expect(201);
                expect(response.body.success).toBe(true);
                expect(response.body.message).toContain('协作者');
            });
            it('添加后协作者应该出现在任务详情中', async () => {
                const response = await request(app)
                    .get(`/api/tasks/${taskId}`)
                    .set('Authorization', `Bearer ${creatorToken}`);
                const isCollaborator = response.body.data.collaborators.some((c) => c.userId === collaboratorId);
                expect(isCollaborator).toBe(true);
            });
            it('应该拒绝重复添加协作者', async () => {
                const response = await request(app)
                    .post(`/api/tasks/${taskId}/collaborators`)
                    .set('Authorization', `Bearer ${creatorToken}`)
                    .send({
                    userId: collaboratorId
                })
                    .expect(400);
                expect(response.body.success).toBe(false);
            });
        });
        describe('移除协作者', () => {
            it('应该能够移除任务协作者', async () => {
                const response = await request(app)
                    .delete(`/api/tasks/${taskId}/collaborators/${collaboratorId}`)
                    .set('Authorization', `Bearer ${creatorToken}`)
                    .expect(200);
                expect(response.body.success).toBe(true);
            });
            it('移除后协作者不应该出现在任务详情中', async () => {
                const response = await request(app)
                    .get(`/api/tasks/${taskId}`)
                    .set('Authorization', `Bearer ${creatorToken}`);
                const isCollaborator = response.body.data.collaborators.some((c) => c.userId === collaboratorId);
                expect(isCollaborator).toBe(false);
            });
        });
    });
    /**
     * 删除任务测试
     */
    describe('DELETE /api/tasks/:id - 删除任务', () => {
        let deleteTaskId;
        beforeEach(async () => {
            // 创建一个用于删除测试的任务
            const response = await request(app)
                .post('/api/tasks')
                .set('Authorization', `Bearer ${creatorToken}`)
                .send({
                projectId,
                title: 'Delete Test Task',
                dueDate: tomorrow.toISOString(),
                assigneeId: assigneeId
            });
            deleteTaskId = response.body.data.id;
        });
        describe('删除任务成功', () => {
            it('项目成员应该能够删除任务', async () => {
                const response = await request(app)
                    .delete(`/api/tasks/${deleteTaskId}`)
                    .set('Authorization', `Bearer ${creatorToken}`)
                    .expect(200);
                expect(response.body.success).toBe(true);
                expect(response.body.message).toContain('删除');
            });
            it('删除后的任务不应该出现在列表中', async () => {
                const response = await request(app)
                    .get('/api/tasks')
                    .set('Authorization', `Bearer ${creatorToken}`);
                const deletedTask = response.body.data.find((t) => t.id === deleteTaskId);
                expect(deletedTask).toBeUndefined();
            });
            it('删除后的任务访问应该返回404', async () => {
                const response = await request(app)
                    .get(`/api/tasks/${deleteTaskId}`)
                    .set('Authorization', `Bearer ${creatorToken}`)
                    .expect(404);
                expect(response.body.success).toBe(false);
            });
        });
        describe('删除任务权限验证', () => {
            it('非项目成员不应该能够删除任务', async () => {
                const response = await request(app)
                    .delete(`/api/tasks/${deleteTaskId}`)
                    .set('Authorization', `Bearer ${outsiderToken}`)
                    .expect(403);
                expect(response.body.success).toBe(false);
            });
            it('删除不存在的任务应该返回404', async () => {
                const fakeId = '00000000-0000-0000-0000-000000000000';
                const response = await request(app)
                    .delete(`/api/tasks/${fakeId}`)
                    .set('Authorization', `Bearer ${creatorToken}`)
                    .expect(404);
                expect(response.body.success).toBe(false);
            });
        });
    });
    /**
     * 任务评论测试
     */
    describe('任务评论测试', () => {
        describe('添加评论', () => {
            it('项目成员应该能够添加评论', async () => {
                const response = await request(app)
                    .post(`/api/tasks/${taskId}/comments`)
                    .set('Authorization', `Bearer ${creatorToken}`)
                    .send({
                    content: 'This is a test comment'
                })
                    .expect(201);
                expect(response.body.success).toBe(true);
                expect(response.body.data.content).toBe('This is a test comment');
                expect(response.body.data).toHaveProperty('user');
            });
            it('评论应该出现在任务详情中', async () => {
                const response = await request(app)
                    .get(`/api/tasks/${taskId}`)
                    .set('Authorization', `Bearer ${creatorToken}`);
                expect(response.body.data.comments.length).toBeGreaterThanOrEqual(1);
            });
        });
        describe('删除评论', () => {
            let commentId;
            beforeEach(async () => {
                const response = await request(app)
                    .post(`/api/tasks/${taskId}/comments`)
                    .set('Authorization', `Bearer ${creatorToken}`)
                    .send({
                    content: 'Comment to be deleted'
                });
                commentId = response.body.data.id;
            });
            it('评论作者应该能够删除自己的评论', async () => {
                const response = await request(app)
                    .delete(`/api/tasks/${taskId}/comments/${commentId}`)
                    .set('Authorization', `Bearer ${creatorToken}`)
                    .expect(200);
                expect(response.body.success).toBe(true);
            });
            it('非评论作者不应该能够删除评论', async () => {
                // 创建一个新评论
                const commentResponse = await request(app)
                    .post(`/api/tasks/${taskId}/comments`)
                    .set('Authorization', `Bearer ${creatorToken}`)
                    .send({
                    content: 'Another comment'
                });
                const newCommentId = commentResponse.body.data.id;
                const response = await request(app)
                    .delete(`/api/tasks/${taskId}/comments/${newCommentId}`)
                    .set('Authorization', `Bearer ${assigneeToken}`)
                    .expect(403);
                expect(response.body.success).toBe(false);
            });
        });
    });
    /**
     * 任务类别测试
     */
    describe('任务类别测试', () => {
        describe('获取任务类别', () => {
            it('应该返回任务类别列表', async () => {
                const response = await request(app)
                    .get('/api/tasks/categories')
                    .set('Authorization', `Bearer ${creatorToken}`)
                    .expect(200);
                expect(response.body.success).toBe(true);
                expect(Array.isArray(response.body.data)).toBe(true);
            });
            it('应该能够按项目筛选类别', async () => {
                const response = await request(app)
                    .get(`/api/tasks/categories?projectId=${projectId}`)
                    .set('Authorization', `Bearer ${creatorToken}`)
                    .expect(200);
                expect(response.body.success).toBe(true);
            });
        });
        describe('创建任务类别', () => {
            it('应该能够创建任务类别', async () => {
                const response = await request(app)
                    .post('/api/tasks/categories')
                    .set('Authorization', `Bearer ${creatorToken}`)
                    .send({
                    projectId,
                    name: 'Test Category',
                    color: '#FF5733'
                })
                    .expect(201);
                expect(response.body.success).toBe(true);
                expect(response.body.data.name).toBe('Test Category');
                expect(response.body.data.color).toBe('#FF5733');
            });
        });
    });
});
//# sourceMappingURL=task.test.js.map