/**
 * 中集智历 - 项目模块测试
 *
 * 测试覆盖：
 * - 项目创建
 * - 获取项目列表
 * - 获取项目详情
 * - 更新项目
 * - 删除项目
 * - 成员管理
 */
import request from 'supertest';
import prisma from '../config/database.js';
import app from '../app.js';

// 测试用户数据
const ownerUser = {
  email: 'project-owner@example.com',
  password: 'Test123456',
  nickname: 'Project Owner',
  securityQuestion: 0,
  securityAnswer: 'Owner Answer'
};

const memberUser = {
  email: 'project-member@example.com',
  password: 'Test123456',
  nickname: 'Project Member',
  securityQuestion: 0,
  securityAnswer: 'Member Answer'
};

const otherUser = {
  email: 'other-user@example.com',
  password: 'Test123456',
  nickname: 'Other User',
  securityQuestion: 0,
  securityAnswer: 'Other Answer'
};

// 存储Token和ID
let ownerToken: string;
let memberToken: string;
let otherToken: string;
let ownerId: string;
let memberId: string;
let otherId: string;
let projectId: string;
let privateProjectId: string;

/**
 * 项目模块测试套件
 */
describe('项目模块测试', () => {
  // 测试前准备数据
  beforeAll(async () => {
    // 清理测试数据
    await prisma.task.deleteMany({
      where: {
        project: {
          name: { in: ['Test Project', 'Private Project', 'Update Test Project', 'Delete Test Project'] }
        }
      }
    });
    await prisma.projectMember.deleteMany({
      where: {
        project: {
          name: { in: ['Test Project', 'Private Project', 'Update Test Project', 'Delete Test Project'] }
        }
      }
    });
    await prisma.project.deleteMany({
      where: {
        name: { in: ['Test Project', 'Private Project', 'Update Test Project', 'Delete Test Project'] }
      }
    });
    await prisma.securityAnswer.deleteMany({
      where: {
        user: {
          email: { in: [ownerUser.email, memberUser.email, otherUser.email] }
        }
      }
    });
    await prisma.user.deleteMany({
      where: {
        email: { in: [ownerUser.email, memberUser.email, otherUser.email] }
      }
    });

    // 创建测试用户
    const ownerResponse = await request(app)
      .post('/api/auth/register')
      .send(ownerUser);
    ownerToken = ownerResponse.body.data.token;
    ownerId = ownerResponse.body.data.user.id;

    const memberResponse = await request(app)
      .post('/api/auth/register')
      .send(memberUser);
    memberToken = memberResponse.body.data.token;
    memberId = memberResponse.body.data.user.id;

    const otherResponse = await request(app)
      .post('/api/auth/register')
      .send(otherUser);
    otherToken = otherResponse.body.data.token;
    otherId = otherResponse.body.data.user.id;
  });

  // 测试后清理
  afterAll(async () => {
    await prisma.task.deleteMany({
      where: {
        project: {
          name: { in: ['Test Project', 'Private Project', 'Update Test Project', 'Delete Test Project'] }
        }
      }
    });
    await prisma.projectMember.deleteMany({
      where: {
        project: {
          name: { in: ['Test Project', 'Private Project', 'Update Test Project', 'Delete Test Project'] }
        }
      }
    });
    await prisma.project.deleteMany({
      where: {
        name: { in: ['Test Project', 'Private Project', 'Update Test Project', 'Delete Test Project'] }
      }
    });
    await prisma.securityAnswer.deleteMany({
      where: {
        user: {
          email: { in: [ownerUser.email, memberUser.email, otherUser.email] }
        }
      }
    });
    await prisma.user.deleteMany({
      where: {
        email: { in: [ownerUser.email, memberUser.email, otherUser.email] }
      }
    });
    await prisma.$disconnect();
  });

  /**
   * 项目创建测试
   */
  describe('POST /api/projects - 项目创建', () => {

    describe('创建公开项目', () => {
      it('应该成功创建公开项目', async () => {
        const response = await request(app)
          .post('/api/projects')
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({
            name: 'Test Project',
            description: 'A test project for testing',
            visibility: 'PUBLIC'
          })
          .expect('Content-Type', /json/)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('id');
        expect(response.body.data.name).toBe('Test Project');
        expect(response.body.data.visibility).toBe('PUBLIC');
        expect(response.body.data.ownerId).toBe(ownerId);

        projectId = response.body.data.id;
      });

      it('创建项目后创建者应该自动成为项目成员', async () => {
        const response = await request(app)
          .get(`/api/projects/${projectId}/members`)
          .set('Authorization', `Bearer ${ownerToken}`);

        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].userId).toBe(ownerId);
        expect(response.body.data[0].role).toBe('OWNER');
      });
    });

    describe('创建私有项目', () => {
      it('应该成功创建私有项目', async () => {
        const response = await request(app)
          .post('/api/projects')
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({
            name: 'Private Project',
            description: 'A private project',
            visibility: 'PRIVATE'
          })
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.visibility).toBe('PRIVATE');

        privateProjectId = response.body.data.id;
      });
    });

    describe('创建项目验证', () => {
      it('应该拒绝空项目名称', async () => {
        const response = await request(app)
          .post('/api/projects')
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({
            name: '',
            visibility: 'PUBLIC'
          })
          .expect(400);

        expect(response.body.success).toBe(false);
      });

      it('应该拒绝无效的可见性值', async () => {
        const response = await request(app)
          .post('/api/projects')
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({
            name: 'Invalid Visibility Project',
            visibility: 'INVALID'
          })
          .expect(400);

        expect(response.body.success).toBe(false);
      });

      it('未登录用户应该无法创建项目', async () => {
        const response = await request(app)
          .post('/api/projects')
          .send({
            name: 'Unauthorized Project',
            visibility: 'PUBLIC'
          })
          .expect(401);

        expect(response.body.success).toBe(false);
      });
    });
  });

  /**
   * 获取项目列表测试
   */
  describe('GET /api/projects - 获取项目列表', () => {

    describe('获取用户项目列表', () => {
      it('应该返回用户有权限的项目列表', async () => {
        const response = await request(app)
          .get('/api/projects')
          .set('Authorization', `Bearer ${ownerToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.length).toBeGreaterThanOrEqual(1);
      });

      it('项目列表应该包含项目基本信息', async () => {
        const response = await request(app)
          .get('/api/projects')
          .set('Authorization', `Bearer ${ownerToken}`);

        const project = response.body.data.find((p: { id: string }) => p.id === projectId);

        expect(project).toBeDefined();
        expect(project).toHaveProperty('id');
        expect(project).toHaveProperty('name');
        expect(project).toHaveProperty('visibility');
        expect(project).toHaveProperty('owner');
        expect(project.owner.id).toBe(ownerId);
      });

      it('非成员用户不应该看到私有项目', async () => {
        const response = await request(app)
          .get('/api/projects')
          .set('Authorization', `Bearer ${otherToken}`);

        const privateProject = response.body.data.find(
          (p: { id: string }) => p.id === privateProjectId
        );

        expect(privateProject).toBeUndefined();
      });
    });

    describe('获取公开项目列表', () => {
      it('应该返回所有公开项目', async () => {
        const response = await request(app)
          .get('/api/projects/public')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);

        const publicProjects = response.body.data.filter(
          (p: { visibility: string }) => p.visibility === 'PUBLIC'
        );
        expect(publicProjects.length).toBe(response.body.data.length);
      });

      it('未登录用户也可以查看公开项目', async () => {
        const response = await request(app)
          .get('/api/projects/public')
          .expect(200);

        expect(response.body.success).toBe(true);
      });
    });
  });

  /**
   * 获取项目详情测试
   */
  describe('GET /api/projects/:id - 获取项目详情', () => {

    describe('获取公开项目详情', () => {
      it('应该返回项目详细信息', async () => {
        const response = await request(app)
          .get(`/api/projects/${projectId}`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBe(projectId);
        expect(response.body.data.name).toBe('Test Project');
        expect(response.body.data).toHaveProperty('members');
        expect(response.body.data).toHaveProperty('owner');
      });

      it('非成员可以查看公开项目详情', async () => {
        const response = await request(app)
          .get(`/api/projects/${projectId}`)
          .set('Authorization', `Bearer ${otherToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBe(projectId);
      });
    });

    describe('获取私有项目详情', () => {
      it('成员可以查看私有项目详情', async () => {
        const response = await request(app)
          .get(`/api/projects/${privateProjectId}`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      it('非成员不能查看私有项目详情', async () => {
        const response = await request(app)
          .get(`/api/projects/${privateProjectId}`)
          .set('Authorization', `Bearer ${otherToken}`)
          .expect(403);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('无权');
      });
    });

    describe('项目不存在的情况', () => {
      it('应该返回404当项目不存在时', async () => {
        const fakeId = '00000000-0000-0000-0000-000000000000';
        const response = await request(app)
          .get(`/api/projects/${fakeId}`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('不存在');
      });
    });
  });

  /**
   * 更新项目测试
   */
  describe('PUT /api/projects/:id - 更新项目', () => {

    describe('项目负责人更新项目', () => {
      it('应该成功更新项目信息', async () => {
        const response = await request(app)
          .put(`/api/projects/${projectId}`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({
            name: 'Updated Test Project',
            description: 'Updated description',
            visibility: 'PUBLIC'
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.name).toBe('Updated Test Project');
      });

      it('应该能够更新项目描述', async () => {
        const response = await request(app)
          .put(`/api/projects/${projectId}`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({
            description: 'New description for testing'
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.description).toBe('New description for testing');
      });
    });

    describe('非项目负责人更新项目', () => {
      it('非项目负责人应该无法更新项目', async () => {
        const response = await request(app)
          .put(`/api/projects/${projectId}`)
          .set('Authorization', `Bearer ${otherToken}`)
          .send({
            name: 'Hacked Project Name'
          })
          .expect(403);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('负责人');
      });
    });

    describe('更新项目验证', () => {
      it('应该拒绝空的项目名称', async () => {
        const response = await request(app)
          .put(`/api/projects/${projectId}`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({
            name: ''
          })
          .expect(400);

        expect(response.body.success).toBe(false);
      });

      it('更新不存在的项目应该返回404', async () => {
        const fakeId = '00000000-0000-0000-0000-000000000000';
        const response = await request(app)
          .put(`/api/projects/${fakeId}`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({
            name: 'Non-existent Project'
          })
          .expect(404);

        expect(response.body.success).toBe(false);
      });
    });
  });

  /**
   * 删除项目测试
   */
  describe('DELETE /api/projects/:id - 删除项目', () => {
    let deleteProjectId: string;

    beforeEach(async () => {
      // 创建一个用于删除测试的项目
      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Delete Test Project',
          visibility: 'PUBLIC'
        });
      deleteProjectId = response.body.data.id;
    });

    describe('项目负责人删除项目', () => {
      it('应该成功删除项目（软删除）', async () => {
        const response = await request(app)
          .delete(`/api/projects/${deleteProjectId}`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('删除');
      });

      it('删除后的项目不应该出现在列表中', async () => {
        const response = await request(app)
          .get('/api/projects')
          .set('Authorization', `Bearer ${ownerToken}`);

        const deletedProject = response.body.data.find(
          (p: { id: string }) => p.id === deleteProjectId
        );

        expect(deletedProject).toBeUndefined();
      });

      it('删除后的项目访问应该返回404', async () => {
        const response = await request(app)
          .get(`/api/projects/${deleteProjectId}`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .expect(404);

        expect(response.body.success).toBe(false);
      });
    });

    describe('非项目负责人删除项目', () => {
      it('非项目负责人应该无法删除项目', async () => {
        // 创建新项目
        const createResponse = await request(app)
          .post('/api/projects')
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({
            name: 'Protected Project',
            visibility: 'PUBLIC'
          });
        const protectedProjectId = createResponse.body.data.id;

        const response = await request(app)
          .delete(`/api/projects/${protectedProjectId}`)
          .set('Authorization', `Bearer ${otherToken}`)
          .expect(403);

        expect(response.body.success).toBe(false);

        // 清理
        await request(app)
          .delete(`/api/projects/${protectedProjectId}`)
          .set('Authorization', `Bearer ${ownerToken}`);
      });
    });
  });

  /**
   * 成员管理测试
   */
  describe('成员管理测试', () => {

    describe('获取项目成员', () => {
      it('应该返回项目成员列表', async () => {
        const response = await request(app)
          .get(`/api/projects/${projectId}/members`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.length).toBeGreaterThanOrEqual(1);
      });

      it('成员信息应该包含用户基本信息', async () => {
        const response = await request(app)
          .get(`/api/projects/${projectId}/members`)
          .set('Authorization', `Bearer ${ownerToken}`);

        const member = response.body.data[0];
        expect(member).toHaveProperty('userId');
        expect(member).toHaveProperty('role');
        expect(member).toHaveProperty('user');
        expect(member.user).toHaveProperty('nickname');
      });
    });

    describe('添加项目成员', () => {
      it('项目负责人应该能够添加成员', async () => {
        const response = await request(app)
          .post(`/api/projects/${projectId}/members`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({
            userId: memberId
          })
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.userId).toBe(memberId);
        expect(response.body.data.role).toBe('MEMBER');
      });

      it('添加后成员应该能够访问项目', async () => {
        const response = await request(app)
          .get(`/api/projects/${projectId}`)
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      it('应该拒绝重复添加成员', async () => {
        const response = await request(app)
          .post(`/api/projects/${projectId}/members`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({
            userId: memberId
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('已是');
      });

      it('非项目负责人不应该能够添加成员', async () => {
        const response = await request(app)
          .post(`/api/projects/${projectId}/members`)
          .set('Authorization', `Bearer ${memberToken}`)
          .send({
            userId: otherId
          })
          .expect(403);

        expect(response.body.success).toBe(false);
      });
    });

    describe('移除项目成员', () => {
      it('项目负责人应该能够移除成员', async () => {
        // 先添加成员
        await request(app)
          .post(`/api/projects/${projectId}/members`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({
            userId: otherId
          });

        const response = await request(app)
          .delete(`/api/projects/${projectId}/members/${otherId}`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      it('成员移除后不应该能访问私有项目', async () => {
        // 添加成员到私有项目
        await request(app)
          .post(`/api/projects/${privateProjectId}/members`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({
            userId: otherId
          });

        // 移除成员
        await request(app)
          .delete(`/api/projects/${privateProjectId}/members/${otherId}`)
          .set('Authorization', `Bearer ${ownerToken}`);

        // 验证无法访问
        const response = await request(app)
          .get(`/api/projects/${privateProjectId}`)
          .set('Authorization', `Bearer ${otherToken}`)
          .expect(403);

        expect(response.body.success).toBe(false);
      });

      it('项目负责人不能被移除', async () => {
        const response = await request(app)
          .delete(`/api/projects/${projectId}/members/${ownerId}`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('负责人');
      });

      it('成员可以自己退出项目', async () => {
        // 添加成员
        await request(app)
          .post(`/api/projects/${projectId}/members`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({
            userId: otherId
          });

        // 成员自己退出
        const response = await request(app)
          .delete(`/api/projects/${projectId}/members/${otherId}`)
          .set('Authorization', `Bearer ${otherToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
      });
    });

    describe('项目邀请', () => {
      it('项目成员应该能够邀请其他用户', async () => {
        const response = await request(app)
          .post(`/api/projects/${projectId}/invite`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({
            inviteeId: otherId
          })
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('邀请');
      });

      it('非项目成员不应该能够邀请他人', async () => {
        // 创建一个新用户
        const newUser = {
          email: 'outsider@example.com',
          password: 'Test123456',
          nickname: 'Outsider',
          securityQuestion: 0,
          securityAnswer: 'Answer'
        };
        const newUserResponse = await request(app)
          .post('/api/auth/register')
          .send(newUser);
        const newToken = newUserResponse.body.data.token;

        const response = await request(app)
          .post(`/api/projects/${projectId}/invite`)
          .set('Authorization', `Bearer ${newToken}`)
          .send({
            inviteeId: otherId
          })
          .expect(403);

        expect(response.body.success).toBe(false);

        // 清理
        await prisma.user.delete({ where: { email: newUser.email } });
      });

      it('用户应该能够接受邀请', async () => {
        // 发送邀请
        await request(app)
          .post(`/api/projects/${projectId}/invite`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({
            inviteeId: otherId
          });

        // 接受邀请
        const response = await request(app)
          .post(`/api/projects/${projectId}/invite/accept`)
          .set('Authorization', `Bearer ${otherToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);

        // 验证已成为成员
        const membersResponse = await request(app)
          .get(`/api/projects/${projectId}/members`)
          .set('Authorization', `Bearer ${ownerToken}`);

        const isMember = membersResponse.body.data.some(
          (m: { userId: string }) => m.userId === otherId
        );
        expect(isMember).toBe(true);
      });

      it('用户应该能够拒绝邀请', async () => {
        // 创建新项目用于测试
        const projectResponse = await request(app)
          .post('/api/projects')
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({
            name: 'Invite Test Project',
            visibility: 'PUBLIC'
          });
        const inviteProjectId = projectResponse.body.data.id;

        // 创建新用户
        const newUser = {
          email: 'invitee@example.com',
          password: 'Test123456',
          nickname: 'Invitee',
          securityQuestion: 0,
          securityAnswer: 'Answer'
        };
        const newUserResponse = await request(app)
          .post('/api/auth/register')
          .send(newUser);
        const newToken = newUserResponse.body.data.token;
        const newUserId = newUserResponse.body.data.user.id;

        // 发送邀请
        await request(app)
          .post(`/api/projects/${inviteProjectId}/invite`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({
            inviteeId: newUserId
          });

        // 拒绝邀请
        const response = await request(app)
          .post(`/api/projects/${inviteProjectId}/invite/reject`)
          .set('Authorization', `Bearer ${newToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);

        // 清理
        await prisma.projectMember.deleteMany({
          where: { projectId: inviteProjectId }
        });
        await prisma.project.delete({ where: { id: inviteProjectId } });
        await prisma.user.delete({ where: { email: newUser.email } });
      });
    });
  });
});
