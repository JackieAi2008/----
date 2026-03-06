interface TokenPayload {
    userId: string;
    role: string;
}
/**
 * 生成JWT Token
 */
export declare function generateToken(payload: TokenPayload): string;
/**
 * 验证JWT Token
 */
export declare function verifyToken(token: string): TokenPayload | null;
export {};
//# sourceMappingURL=jwt.d.ts.map