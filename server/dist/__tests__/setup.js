/**
 * 中集智历 - 测试环境设置
 */
import { config } from 'dotenv';
// 加载测试环境变量
config({ path: '.env.test' });
// 设置测试环境
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing';
process.env.JWT_EXPIRES_IN = '1h';
process.env.DATABASE_URL = 'file:./test.db';
// 增加Jest超时时间
jest.setTimeout(30000);
// 全局测试钩子
beforeAll(async () => {
    // 测试开始前的设置
    console.log('Starting test suite...');
});
afterAll(async () => {
    // 测试结束后的清理
    console.log('Test suite completed.');
});
// 导出测试工具函数
export const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
//# sourceMappingURL=setup.js.map