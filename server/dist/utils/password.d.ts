/**
 * 加密密码
 */
export declare function hashPassword(password: string): Promise<string>;
/**
 * 验证密码
 */
export declare function comparePassword(password: string, hashedPassword: string): Promise<boolean>;
//# sourceMappingURL=password.d.ts.map