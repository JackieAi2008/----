import { generateToken, verifyToken } from '../../utils/jwt.js';

describe('JWT安全测试', () => {
  const testUserId = 'test-user-id-123';
  const testRole = 'USER';

  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret-key-for-testing';
    process.env.JWT_EXPIRES_IN = '1h';
  });

  it('应该生成有效的JWT Token', () => {
    const token = generateToken({ userId: testUserId, role: testRole });

    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3); // JWT有3部分
  });

  it('Token应该包含正确的payload', () => {
    const token = generateToken({ userId: testUserId, role: testRole });
    const decoded = verifyToken(token);

    expect(decoded).not.toBeNull();
    expect(decoded?.userId).toBe(testUserId);
    expect(decoded?.role).toBe(testRole);
  });

  it('应该拒绝无效的Token', () => {
    const result = verifyToken('invalid-token');
    expect(result).toBeNull();
  });

  it('应该拒绝空Token', () => {
    const result = verifyToken('');
    expect(result).toBeNull();
  });

  it('应该拒绝被篡改的Token', () => {
    const token = generateToken({ userId: testUserId, role: testRole });
    const tamperedToken = token.slice(0, -5) + 'xxxxx';

    const result = verifyToken(tamperedToken);
    expect(result).toBeNull();
  });

  it('管理员Token应该包含ADMIN角色', () => {
    const adminToken = generateToken({ userId: 'admin-id', role: 'ADMIN' });
    const decoded = verifyToken(adminToken);

    expect(decoded?.role).toBe('ADMIN');
  });
});
