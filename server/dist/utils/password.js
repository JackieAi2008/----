/**
 * 中集智历 - 密码工具函数
 */
import bcrypt from 'bcryptjs';
const SALT_ROUNDS = 10;
/**
 * 加密密码
 */
export async function hashPassword(password) {
    return bcrypt.hash(password, SALT_ROUNDS);
}
/**
 * 验证密码
 */
export async function comparePassword(password, hashedPassword) {
    return bcrypt.compare(password, hashedPassword);
}
//# sourceMappingURL=password.js.map