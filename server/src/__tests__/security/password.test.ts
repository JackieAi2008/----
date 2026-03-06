import { hashPassword, comparePassword } from '../../utils/password.js';

describe('密码安全测试', () => {
  it('应该使用bcrypt加密密码', async () => {
    const password = 'TestPassword123';
    const hashed = await hashPassword(password);

    // bcrypt哈希应该以$2a$或$2b$开头
    expect(hashed).toMatch(/^\$2[ab]\$/);
    expect(hashed).not.toBe(password);
  });

  it('每次加密应该生成不同的哈希值', async () => {
    const password = 'TestPassword123';
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);

    expect(hash1).not.toBe(hash2);
  });

  it('应该正确验证密码', async () => {
    const password = 'TestPassword123';
    const hashed = await hashPassword(password);

    expect(await comparePassword(password, hashed)).toBe(true);
    expect(await comparePassword('WrongPassword', hashed)).toBe(false);
  });

  it('应该能处理中文密码', async () => {
    const password = '测试密码123';
    const hashed = await hashPassword(password);

    expect(await comparePassword(password, hashed)).toBe(true);
  });

  it('应该能处理特殊字符密码', async () => {
    const password = 'P@ssw0rd!#$%^&*()';
    const hashed = await hashPassword(password);

    expect(await comparePassword(password, hashed)).toBe(true);
  });
});
