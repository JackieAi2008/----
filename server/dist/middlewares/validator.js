import { validationResult } from 'express-validator';
/**
 * 验证结果处理中间件
 */
export function validate(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: '参数验证失败',
            errors: errors.array().map((e) => ({
                field: 'path' in e ? e.path : 'unknown',
                message: e.msg
            }))
        });
    }
    next();
}
/**
 * 创建验证中间件
 */
export function createValidator(validations) {
    return [...validations, validate];
}
//# sourceMappingURL=validator.js.map