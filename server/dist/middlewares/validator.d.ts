/**
 * 中集智历 - 参数验证中间件
 */
import { Request, Response, NextFunction } from 'express';
import { ValidationChain } from 'express-validator';
/**
 * 验证结果处理中间件
 */
export declare function validate(req: Request, res: Response, next: NextFunction): Response<any, Record<string, any>> | undefined;
/**
 * 创建验证中间件
 */
export declare function createValidator(validations: ValidationChain[]): (ValidationChain | typeof validate)[];
//# sourceMappingURL=validator.d.ts.map