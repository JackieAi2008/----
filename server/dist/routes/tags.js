/**
 * 中集智历 - 标签路由
 */
import { Router } from 'express';
import { body } from 'express-validator';
import * as tagController from '../controllers/tagController.js';
import { auth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validator.js';
const router = Router();
// 创建标签验证规则
const createTagValidation = [
    body('name').trim().notEmpty().withMessage('标签名称不能为空')
        .isLength({ max: 20 }).withMessage('标签名称最长20个字符'),
    validate
];
// 更新任务标签验证规则
const updateTaskTagsValidation = [
    body('tags').isArray().withMessage('标签必须是数组'),
    body('tags.*').isString().withMessage('标签必须是字符串'),
    validate
];
/**
 * @route   GET /api/tags
 * @desc    获取所有标签
 * @access  Private
 */
router.get('/', auth, tagController.getTags);
/**
 * @route   GET /api/tags/colors
 * @desc    获取预定义标签颜色
 * @access  Private
 */
router.get('/colors', auth, tagController.getTagColors);
/**
 * @route   POST /api/tags
 * @desc    创建标签
 * @access  Private
 */
router.post('/', auth, createTagValidation, tagController.createTag);
/**
 * @route   PUT /api/tasks/:id/tags
 * @desc    更新任务标签
 * @access  Private
 */
router.put('/tasks/:id', auth, updateTaskTagsValidation, tagController.updateTaskTags);
export default router;
//# sourceMappingURL=tags.js.map