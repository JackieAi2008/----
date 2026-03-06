import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/jwt.js';
/**
 * 验证JWT Token中间件
 */
export function auth(req, res, next) {
    try {
        // 从请求头获取token
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: '未登录，请先登录'
            });
        }
        const token = authHeader.split(' ')[1];
        // 验证token
        const decoded = jwt.verify(token, jwtConfig.secret);
        req.userId = decoded.userId;
        req.userRole = decoded.role;
        next();
    }
    catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            return res.status(401).json({
                success: false,
                message: 'Token已过期，请重新登录'
            });
        }
        if (error instanceof jwt.JsonWebTokenError) {
            return res.status(401).json({
                success: false,
                message: '无效的Token'
            });
        }
        return res.status(500).json({
            success: false,
            message: '认证失败'
        });
    }
}
/**
 * 可选认证中间件（不强制要求登录）
 */
export function optionalAuth(req, _res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, jwtConfig.secret);
            req.userId = decoded.userId;
            req.userRole = decoded.role;
        }
        next();
    }
    catch {
        // 忽略错误，继续执行
        next();
    }
}
/**
 * 管理员权限中间件
 */
export function requireAdmin(req, res, next) {
    if (req.userRole !== 'ADMIN') {
        return res.status(403).json({
            success: false,
            message: '需要管理员权限'
        });
    }
    next();
}
//# sourceMappingURL=auth.js.map