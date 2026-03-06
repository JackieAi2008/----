/**
 * 中集智历 - 错误处理中间件
 */
import { Request, Response, NextFunction } from 'express';
/**
 * 自定义API错误类
 */
export declare class ApiError extends Error {
    statusCode: number;
    code?: string;
    constructor(statusCode: number, message: string, code?: string);
}
/**
 * 错误处理中间件
 */
export declare function errorHandler(err: Error | ApiError, _req: Request, res: Response, _next: NextFunction): Response<any, Record<string, any>>;
//# sourceMappingURL=errorHandler.d.ts.map