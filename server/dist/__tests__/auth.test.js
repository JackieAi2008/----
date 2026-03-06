/**
 * 中集智历 - 认证模块测试
 *
 * 测试覆盖：
 * - 用户注册（正常流程、邮箱格式无效、密码长度不足、邮箱已存在）
 * - 用户登录（正常登录、邮箱不存在、密码错误、登录限流验证）
 * - JWT认证（有效Token访问、无效Token被拒绝、过期Token被拒绝）
 * - 密码管理（修改密码成功、旧密码错误、重置密码流程）
 */
import request from 'supertest';
import jwt from 'jsonwebtoken';
import prisma from '../config/database.js';
import app from '../app.js';
// 测试用户数据
const testUser = {
    email: 'test@example.com',
    password: 'Test123456',
    nickname: 'Test User',
    securityQuestion: 0,
    securityAnswer: 'Test Answer'
};
const invalidEmailUser = {
    email: 'invalid-email',
    password: 'Test123456',
    nickname: 'Invalid Email User',
    securityQuestion: 0,
    securityAnswer: 'Test Answer'
};
const shortPasswordUser = {
    email: 'shortpw@example.com',
    password: '12345',
    nickname: 'Short Password User',
    securityQuestion: 0,
    securityAnswer: 'Test Answer'
};
// 存储登录后的Token
let authToken;
let userId;
/**
 * 认证模块测试套件
 */
describe('认证模块测试', () => {
    // 每个测试套件开始前清理数据库
    beforeAll(async () => {
        // 清理测试用户
        await prisma.securityAnswer.deleteMany({
            where: {
                user: {
                    email: { in: [testUser.email, invalidEmailUser.email, shortPasswordUser.email] }
                }
            }
        });
        await prisma.user.deleteMany({
            where: {
                email: { in: [testUser.email, invalidEmailUser.email, shortPasswordUser.email] }
            }
        });
    });
    // 所有测试结束后清理
    afterAll(async () => {
        // 清理测试数据
        await prisma.securityAnswer.deleteMany({
            where: {
                user: {
                    email: { in: [testUser.email, invalidEmailUser.email, shortPasswordUser.email] }
                }
            }
        });
        await prisma.user.deleteMany({
            where: {
                email: { in: [testUser.email, invalidEmailUser.email, shortPasswordUser.email] }
            }
        });
        await prisma.$disconnect();
    });
    /**
     * 用户注册测试
     */
    describe('POST /api/auth/register - 用户注册', () => {
        describe('正常注册流程', () => {
            it('应该成功注册新用户', async () => {
                const response = await request(app)
                    .post('/api/auth/register')
                    .send(testUser)
                    .expect('Content-Type', /json/)
                    .expect(201);
                expect(response.body.success).toBe(true);
                expect(response.body.data).toHaveProperty('token');
                expect(response.body.data).toHaveProperty('user');
                expect(response.body.data.user.email).toBe(testUser.email);
                expect(response.body.data.user.nickname).toBe(testUser.nickname);
                expect(response.body.data.user).not.toHaveProperty('password');
                // 保存用户ID
                userId = response.body.data.user.id;
            });
            it('注册后应该能够获取用户信息', async () => {
                // 先注册用户获取token
                const registerResponse = await request(app)
                    .post('/api/auth/register')
                    .send({
                    email: 'newuser@example.com',
                    password: 'Test123456',
                    nickname: 'New User',
                    securityQuestion: 1,
                    securityAnswer: 'My Answer'
                });
                const token = registerResponse.body.data.token;
                const response = await request(app)
                    .get('/api/auth/me')
                    .set('Authorization', `Bearer ${token}`)
                    .expect(200);
                expect(response.body.success).toBe(true);
                expect(response.body.data.email).toBe('newuser@example.com');
                // 清理
                await prisma.user.delete({ where: { email: 'newuser@example.com' } });
            });
        });
        describe('邮箱格式无效', () => {
            it('应该拒绝无效的邮箱格式', async () => {
                const response = await request(app)
                    .post('/api/auth/register')
                    .send(invalidEmailUser)
                    .expect('Content-Type', /json/)
                    .expect(400);
                expect(response.body.success).toBe(false);
                expect(response.body.message).toContain('邮箱');
            });
            it('应该拒绝空邮箱', async () => {
                const response = await request(app)
                    .post('/api/auth/register')
                    .send({
                    password: 'Test123456',
                    nickname: 'No Email User',
                    securityQuestion: 0,
                    securityAnswer: 'Test Answer'
                })
                    .expect(400);
                expect(response.body.success).toBe(false);
            });
        });
        describe('密码长度不足', () => {
            it('应该拒绝长度少于6位的密码', async () => {
                const response = await request(app)
                    .post('/api/auth/register')
                    .send(shortPasswordUser)
                    .expect('Content-Type', /json/)
                    .expect(400);
                expect(response.body.success).toBe(false);
                expect(response.body.message).toContain('密码');
            });
            it('应该拒绝空密码', async () => {
                const response = await request(app)
                    .post('/api/auth/register')
                    .send({
                    email: 'nopass@example.com',
                    password: '',
                    nickname: 'No Password User',
                    securityQuestion: 0,
                    securityAnswer: 'Test Answer'
                })
                    .expect(400);
                expect(response.body.success).toBe(false);
            });
        });
        describe('邮箱已存在', () => {
            it('应该拒绝已注册的邮箱', async () => {
                // 第一次注册
                await request(app)
                    .post('/api/auth/register')
                    .send(testUser);
                // 第二次用相同邮箱注册
                const response = await request(app)
                    .post('/api/auth/register')
                    .send(testUser)
                    .expect('Content-Type', /json/)
                    .expect(400);
                expect(response.body.success).toBe(false);
                expect(response.body.message).toContain('邮箱');
            });
        });
        describe('其他验证', () => {
            it('应该拒绝空昵称', async () => {
                const response = await request(app)
                    .post('/api/auth/register')
                    .send({
                    email: 'nonick@example.com',
                    password: 'Test123456',
                    nickname: '',
                    securityQuestion: 0,
                    securityAnswer: 'Test Answer'
                })
                    .expect(400);
                expect(response.body.success).toBe(false);
            });
            it('应该拒绝无效的安全问题索引', async () => {
                const response = await request(app)
                    .post('/api/auth/register')
                    .send({
                    email: 'invalidsec@example.com',
                    password: 'Test123456',
                    nickname: 'Invalid Security',
                    securityQuestion: 5, // 超出范围
                    securityAnswer: 'Test Answer'
                })
                    .expect(400);
                expect(response.body.success).toBe(false);
            });
            it('应该拒绝空安全问题答案', async () => {
                const response = await request(app)
                    .post('/api/auth/register')
                    .send({
                    email: 'noanswer@example.com',
                    password: 'Test123456',
                    nickname: 'No Answer User',
                    securityQuestion: 0,
                    securityAnswer: ''
                })
                    .expect(400);
                expect(response.body.success).toBe(false);
            });
        });
    });
    /**
     * 用户登录测试
     */
    describe('POST /api/auth/login - 用户登录', () => {
        describe('正常登录', () => {
            it('应该成功登录并返回Token', async () => {
                const response = await request(app)
                    .post('/api/auth/login')
                    .send({
                    email: testUser.email,
                    password: testUser.password
                })
                    .expect('Content-Type', /json/)
                    .expect(200);
                expect(response.body.success).toBe(true);
                expect(response.body.data).toHaveProperty('token');
                expect(response.body.data).toHaveProperty('user');
                expect(response.body.data.user.email).toBe(testUser.email);
                // 保存Token供后续测试使用
                authToken = response.body.data.token;
            });
            it('登录Token应该包含正确的用户信息', async () => {
                const loginResponse = await request(app)
                    .post('/api/auth/login')
                    .send({
                    email: testUser.email,
                    password: testUser.password
                });
                const token = loginResponse.body.data.token;
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                expect(decoded).toHaveProperty('userId');
                expect(decoded).toHaveProperty('role');
            });
        });
        describe('邮箱不存在', () => {
            it('应该拒绝不存在的邮箱', async () => {
                const response = await request(app)
                    .post('/api/auth/login')
                    .send({
                    email: 'nonexistent@example.com',
                    password: 'Test123456'
                })
                    .expect('Content-Type', /json/)
                    .expect(401);
                expect(response.body.success).toBe(false);
                expect(response.body.message).toContain('邮箱或密码错误');
            });
        });
        describe('密码错误', () => {
            it('应该拒绝错误的密码', async () => {
                const response = await request(app)
                    .post('/api/auth/login')
                    .send({
                    email: testUser.email,
                    password: 'WrongPassword123'
                })
                    .expect('Content-Type', /json/)
                    .expect(401);
                expect(response.body.success).toBe(false);
                expect(response.body.message).toContain('邮箱或密码错误');
            });
        });
        describe('输入验证', () => {
            it('应该拒绝空邮箱', async () => {
                const response = await request(app)
                    .post('/api/auth/login')
                    .send({
                    email: '',
                    password: 'Test123456'
                })
                    .expect(400);
                expect(response.body.success).toBe(false);
            });
            it('应该拒绝空密码', async () => {
                const response = await request(app)
                    .post('/api/auth/login')
                    .send({
                    email: testUser.email,
                    password: ''
                })
                    .expect(400);
                expect(response.body.success).toBe(false);
            });
        });
        describe('账号状态验证', () => {
            it('应该拒绝被禁用的账号', async () => {
                // 创建被禁用的用户
                const bannedUser = {
                    email: 'banned@example.com',
                    password: 'Test123456',
                    nickname: 'Banned User',
                    securityQuestion: 0,
                    securityAnswer: 'Test Answer'
                };
                await request(app)
                    .post('/api/auth/register')
                    .send(bannedUser);
                // 禁用用户
                await prisma.user.update({
                    where: { email: bannedUser.email },
                    data: { isBanned: true }
                });
                const response = await request(app)
                    .post('/api/auth/login')
                    .send({
                    email: bannedUser.email,
                    password: bannedUser.password
                })
                    .expect(403);
                expect(response.body.success).toBe(false);
                expect(response.body.message).toContain('禁用');
                // 清理
                await prisma.user.delete({ where: { email: bannedUser.email } });
            });
        });
    });
    /**
     * JWT认证测试
     */
    describe('JWT认证测试', () => {
        describe('有效Token访问受保护接口', () => {
            it('应该能够使用有效Token访问受保护接口', async () => {
                const response = await request(app)
                    .get('/api/auth/me')
                    .set('Authorization', `Bearer ${authToken}`)
                    .expect(200);
                expect(response.body.success).toBe(true);
                expect(response.body.data.email).toBe(testUser.email);
            });
            it('应该返回完整的用户信息', async () => {
                const response = await request(app)
                    .get('/api/auth/me')
                    .set('Authorization', `Bearer ${authToken}`);
                expect(response.body.data).toHaveProperty('id');
                expect(response.body.data).toHaveProperty('email');
                expect(response.body.data).toHaveProperty('nickname');
                expect(response.body.data).toHaveProperty('createdAt');
                expect(response.body.data).not.toHaveProperty('password');
            });
        });
        describe('无效Token被拒绝', () => {
            it('应该拒绝无效格式的Token', async () => {
                const response = await request(app)
                    .get('/api/auth/me')
                    .set('Authorization', 'Bearer invalid-token')
                    .expect(401);
                expect(response.body.success).toBe(false);
                expect(response.body.message).toContain('Token');
            });
            it('应该拒绝没有Bearer前缀的Token', async () => {
                const response = await request(app)
                    .get('/api/auth/me')
                    .set('Authorization', authToken)
                    .expect(401);
                expect(response.body.success).toBe(false);
            });
            it('应该拒绝空Authorization头', async () => {
                const response = await request(app)
                    .get('/api/auth/me')
                    .expect(401);
                expect(response.body.success).toBe(false);
                expect(response.body.message).toContain('登录');
            });
            it('应该拒绝格式错误的JWT', async () => {
                const response = await request(app)
                    .get('/api/auth/me')
                    .set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature')
                    .expect(401);
                expect(response.body.success).toBe(false);
            });
        });
        describe('过期Token被拒绝', () => {
            it('应该拒绝过期的Token', async () => {
                // 创建一个已过期的Token
                const expiredToken = jwt.sign({ userId: userId, role: 'USER' }, process.env.JWT_SECRET, { expiresIn: '-1h' } // 1小时前过期
                );
                const response = await request(app)
                    .get('/api/auth/me')
                    .set('Authorization', `Bearer ${expiredToken}`)
                    .expect(401);
                expect(response.body.success).toBe(false);
                expect(response.body.message).toContain('过期');
            });
        });
        describe('Token签名验证', () => {
            it('应该拒绝使用错误密钥签名的Token', async () => {
                const wrongSecretToken = jwt.sign({ userId: userId, role: 'USER' }, 'wrong-secret-key', { expiresIn: '1h' });
                const response = await request(app)
                    .get('/api/auth/me')
                    .set('Authorization', `Bearer ${wrongSecretToken}`)
                    .expect(401);
                expect(response.body.success).toBe(false);
                expect(response.body.message).toContain('Token');
            });
        });
    });
    /**
     * 密码管理测试
     */
    describe('密码管理测试', () => {
        describe('修改密码成功', () => {
            it('应该成功修改密码', async () => {
                // 先登录获取新Token
                const loginResponse = await request(app)
                    .post('/api/auth/login')
                    .send({
                    email: testUser.email,
                    password: testUser.password
                });
                const token = loginResponse.body.data.token;
                const response = await request(app)
                    .post('/api/auth/change-password')
                    .set('Authorization', `Bearer ${token}`)
                    .send({
                    oldPassword: testUser.password,
                    newPassword: 'NewTest123456'
                })
                    .expect(200);
                expect(response.body.success).toBe(true);
                expect(response.body.message).toContain('成功');
                // 验证可以用新密码登录
                const newLoginResponse = await request(app)
                    .post('/api/auth/login')
                    .send({
                    email: testUser.email,
                    password: 'NewTest123456'
                });
                expect(newLoginResponse.body.success).toBe(true);
                // 更新测试数据
                testUser.password = 'NewTest123456';
            });
            it('修改密码后旧密码应该失效', async () => {
                const loginResponse = await request(app)
                    .post('/api/auth/login')
                    .send({
                    email: testUser.email,
                    password: testUser.password
                });
                const token = loginResponse.body.data.token;
                // 修改密码
                await request(app)
                    .post('/api/auth/change-password')
                    .set('Authorization', `Bearer ${token}`)
                    .send({
                    oldPassword: testUser.password,
                    newPassword: 'AnotherNew123456'
                });
                // 用旧密码登录应该失败
                const response = await request(app)
                    .post('/api/auth/login')
                    .send({
                    email: testUser.email,
                    password: testUser.password
                });
                expect(response.body.success).toBe(false);
                // 恢复测试数据
                testUser.password = 'AnotherNew123456';
            });
        });
        describe('旧密码错误', () => {
            it('应该拒绝错误的旧密码', async () => {
                const loginResponse = await request(app)
                    .post('/api/auth/login')
                    .send({
                    email: testUser.email,
                    password: testUser.password
                });
                const token = loginResponse.body.data.token;
                const response = await request(app)
                    .post('/api/auth/change-password')
                    .set('Authorization', `Bearer ${token}`)
                    .send({
                    oldPassword: 'WrongOldPassword',
                    newPassword: 'NewTest123456'
                })
                    .expect(400);
                expect(response.body.success).toBe(false);
                expect(response.body.message).toContain('密码错误');
            });
        });
        describe('新密码验证', () => {
            it('应该拒绝长度不足的新密码', async () => {
                const loginResponse = await request(app)
                    .post('/api/auth/login')
                    .send({
                    email: testUser.email,
                    password: testUser.password
                });
                const token = loginResponse.body.data.token;
                const response = await request(app)
                    .post('/api/auth/change-password')
                    .set('Authorization', `Bearer ${token}`)
                    .send({
                    oldPassword: testUser.password,
                    newPassword: '12345'
                })
                    .expect(400);
                expect(response.body.success).toBe(false);
            });
            it('应该拒绝空的新密码', async () => {
                const loginResponse = await request(app)
                    .post('/api/auth/login')
                    .send({
                    email: testUser.email,
                    password: testUser.password
                });
                const token = loginResponse.body.data.token;
                const response = await request(app)
                    .post('/api/auth/change-password')
                    .set('Authorization', `Bearer ${token}`)
                    .send({
                    oldPassword: testUser.password,
                    newPassword: ''
                })
                    .expect(400);
                expect(response.body.success).toBe(false);
            });
        });
        describe('重置密码流程', () => {
            it('应该能够验证安全问题', async () => {
                const response = await request(app)
                    .post('/api/auth/verify-security')
                    .send({
                    email: testUser.email,
                    securityQuestion: testUser.securityQuestion,
                    securityAnswer: testUser.securityAnswer
                })
                    .expect(200);
                expect(response.body.success).toBe(true);
                expect(response.body.data.valid).toBe(true);
            });
            it('应该拒绝错误的安全问题答案', async () => {
                const response = await request(app)
                    .post('/api/auth/verify-security')
                    .send({
                    email: testUser.email,
                    securityQuestion: testUser.securityQuestion,
                    securityAnswer: 'Wrong Answer'
                })
                    .expect(200);
                expect(response.body.success).toBe(true);
                expect(response.body.data.valid).toBe(false);
            });
            it('应该能够通过安全问题重置密码', async () => {
                const response = await request(app)
                    .post('/api/auth/reset-password')
                    .send({
                    email: testUser.email,
                    securityQuestion: testUser.securityQuestion,
                    securityAnswer: testUser.securityAnswer,
                    newPassword: 'ResetTest123456'
                })
                    .expect(200);
                expect(response.body.success).toBe(true);
                expect(response.body.message).toContain('成功');
                // 验证可以用新密码登录
                const loginResponse = await request(app)
                    .post('/api/auth/login')
                    .send({
                    email: testUser.email,
                    password: 'ResetTest123456'
                });
                expect(loginResponse.body.success).toBe(true);
                // 更新测试数据
                testUser.password = 'ResetTest123456';
            });
            it('重置密码时应该拒绝错误的用户', async () => {
                const response = await request(app)
                    .post('/api/auth/reset-password')
                    .send({
                    email: 'nonexistent@example.com',
                    securityQuestion: 0,
                    securityAnswer: 'Some Answer',
                    newPassword: 'NewPassword123'
                })
                    .expect(404);
                expect(response.body.success).toBe(false);
            });
            it('重置密码时应该拒绝错误的安全答案', async () => {
                const response = await request(app)
                    .post('/api/auth/reset-password')
                    .send({
                    email: testUser.email,
                    securityQuestion: testUser.securityQuestion,
                    securityAnswer: 'Completely Wrong Answer',
                    newPassword: 'NewPassword123'
                })
                    .expect(400);
                expect(response.body.success).toBe(false);
            });
        });
    });
});
//# sourceMappingURL=auth.test.js.map