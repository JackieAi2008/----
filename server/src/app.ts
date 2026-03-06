/**
 * 中集智历 - 后端服务入口
 */
import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import compression from 'compression'
import { config } from 'dotenv'

// 加载环境变量
config()

// 导入路由
import authRoutes from './routes/auth.js'
import userRoutes from './routes/users.js'
import projectRoutes from './routes/projects.js'
import taskRoutes from './routes/tasks.js'
import notificationRoutes from './routes/notifications.js'
import dashboardRoutes from './routes/dashboard.js'
import attachmentRoutes from './routes/attachments.js'
import exportRoutes from './routes/export.js'
import searchRoutes from './routes/search.js'
import pushRoutes from './routes/push.js'
import tagRoutes from './routes/tags.js'
import templateRoutes from './routes/templates.js'

// 导入中间件
import { errorHandler } from './middlewares/errorHandler.js'

// 导入服务
import { startScheduler } from './services/schedulerService.js'

// 创建Express应用
const app = express()

// 基础中间件
app.use(cors())
app.use(compression())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// 日志中间件
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'))
}

// 静态文件服务
app.use('/uploads', express.static('uploads'))

// API路由
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/projects', projectRoutes)
app.use('/api/tasks', taskRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api', attachmentRoutes)
app.use('/api/export', exportRoutes)
app.use('/api/search', searchRoutes)
app.use('/api/push', pushRoutes)
app.use('/api/tags', tagRoutes)
app.use('/api/templates', templateRoutes)

// 健康检查
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// 404处理
app.use((_req, res) => {
  res.status(404).json({ success: false, message: '接口不存在' })
})

// 错误处理中间件
app.use(errorHandler)

// 启动服务器
const PORT = parseInt(process.env.PORT || '3000', 10)
const HOST = process.env.HOST || 'localhost'

app.listen(PORT, HOST, () => {
  console.log(`🚀 服务器已启动: http://${HOST}:${PORT}`)
  console.log(`📝 环境: ${process.env.NODE_ENV || 'development'}`)

  // 启动定时任务调度器
  startScheduler()
})

export default app
