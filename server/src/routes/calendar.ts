/**
 * 中集智历 - 日历路由
 */
import { Router } from 'express'
import { auth } from '../middlewares/auth.js'
import * as calendarController from '../controllers/calendarController.js'

const router = Router()

// 获取本周项目任务
router.get('/week-project-tasks', auth, calendarController.getWeekProjectTasks)

export default router
