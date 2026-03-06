/**
 * 中集智历 - 认证路由
 */
import { Router } from 'express';
import { body } from 'express-validator';
import * as authController from '../controllers/authController.js';
import { auth } from '../middlewares/auth.js';
import { authLimiter } from '../middlewares/rateLimiter.js';
import { validate } from '../middlewares/validator.js';
const router = Router();
// 登录验证规则
const loginValidation = [
    body('email').isEmail().withMessage('请输入有效的邮箱地址'),
    body('password').notEmpty().withMessage('请输入密码'),
    validate
];
// 注册验证规则
const registerValidation = [
    body('email').isEmail().withMessage('请输入有效的邮箱地址'),
    body('password').isLength({ min: 6 }).withMessage('密码长度至少6位'),
    body('nickname').notEmpty().withMessage('请输入昵称'),
    body('securityQuestion').isInt({ min: 0, max: 3 }).withMessage('请选择安全问题'),
    body('securityAnswer').notEmpty().withMessage('请输入安全问题答案'),
    validate
];
// 修改密码验证规则
const changePasswordValidation = [
    body('oldPassword').notEmpty().withMessage('请输入当前密码'),
    body('newPassword').isLength({ min: 6 }).withMessage('新密码长度至少6位'),
    validate
];
// 重置密码验证规则
const resetPasswordValidation = [
    body('email').isEmail().withMessage('请输入有效的邮箱地址'),
    body('securityQuestion').isInt({ min: 0, max: 3 }).withMessage('请选择安全问题'),
    body('securityAnswer').notEmpty().withMessage('请输入安全问题答案'),
    body('newPassword').isLength({ min: 6 }).withMessage('新密码长度至少6位'),
    validate
];
/**
 * @route   POST /api/auth/login
 * @desc    用户登录
 * @access  Public
 */
router.post('/login', authLimiter, loginValidation, authController.login);
/**
 * @route   POST /api/auth/register
 * @desc    用户注册
 * @access  Public
 */
router.post('/register', authLimiter, registerValidation, authController.register);
/**
 * @route   GET /api/auth/me
 * @desc    获取当前用户信息
 * @access  Private
 */
router.get('/me', auth, authController.getCurrentUser);
/**
 * @route   POST /api/auth/change-password
 * @desc    修改密码
 * @access  Private
 */
router.post('/change-password', auth, changePasswordValidation, authController.changePassword);
/**
 * @route   POST /api/auth/reset-password
 * @desc    重置密码
 * @access  Public
 */
router.post('/reset-password', authLimiter, resetPasswordValidation, authController.resetPassword);
/**
 * @route   POST /api/auth/verify-security
 * @desc    验证安全问题
 * @access  Public
 */
router.post('/verify-security', authLimiter, authController.verifySecurityQuestion);
/**
 * @route   GET /api/auth/security-question/:email
 * @desc    获取用户的安全问题
 * @access  Public
 */
router.get('/security-question/:email', authLimiter, authController.getSecurityQuestion);
export default router;
//# sourceMappingURL=auth.js.map