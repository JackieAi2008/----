/**
 * 中集智历 - JWT配置
 */
import { randomBytes } from 'crypto';
/**
 * 获取JWT密钥
 * 生产环境必须设置环境变量，开发环境允许使用随机密钥
 */
function getJwtSecret() {
    const secret = process.env.JWT_SECRET;
    if (secret) {
        return secret;
    }
    // 生产环境必须设置JWT_SECRET
    if (process.env.NODE_ENV === 'production') {
        throw new Error('JWT_SECRET环境变量未设置！请在生产环境中配置安全的密钥。');
    }
    // 开发环境使用随机密钥（每次重启会变化）
    const randomSecret = randomBytes(32).toString('hex');
    console.warn('⚠️ [安全警告] JWT_SECRET环境变量未设置，已生成临时随机密钥。');
    console.warn('⚠️ 生产环境请务必配置JWT_SECRET环境变量！');
    return randomSecret;
}
export const jwtConfig = {
    secret: getJwtSecret(),
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
};
//# sourceMappingURL=jwt.js.map