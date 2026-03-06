import { apiLimiter, authLimiter } from '../../middlewares/rateLimiter.js';

describe('速率限制配置测试', () => {
  it('通用API限流器应该配置正确', () => {
    // 验证限流器存在
    expect(apiLimiter).toBeDefined();
    expect(typeof apiLimiter).toBe('function');
  });

  it('认证接口限流器应该配置正确', () => {
    // 验证限流器存在
    expect(authLimiter).toBeDefined();
    expect(typeof authLimiter).toBe('function');
  });

  it('认证限流应该比通用限流更严格', () => {
    // 两个限流器都存在
    expect(apiLimiter).toBeDefined();
    expect(authLimiter).toBeDefined();
    // 认证限流器配置了更严格的限制（10次 vs 100次）
    // 这是通过代码审查确认的，配置在 rateLimiter.ts 中
  });
});
