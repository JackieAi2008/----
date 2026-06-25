# 06 服务层与调度

> 来源:`server/src/services/`、`server/src/utils/`、`server/src/middlewares/`。

## 服务
- `authService.ts` 注册/登录/密码/找回
- `aiSummaryService.ts` 调用 Deepseek 做项目/任务总结(给 image2「AI 总结」打底)
- `recurringTaskService.ts` 循环任务展开
- `schedulerService.ts` 定时器(归档超 30 天已完成、提醒触发等)
- `statisticsService.ts` 概览/报表数据
- `pushService.ts` Web Push 实际发送(VAPID 私钥在 `.env`)

## 中间件
- `auth.ts` JWT 校验 + 角色守卫
- `validator.ts` express-validator 集中校验
- `taskPermission.ts` 任务级权限(`TaskAction` 枚举)
- `departmentPermission.ts` 部门级权限
- `rateLimiter.ts` 限流
- `errorHandler.ts` 统一错误出口

## 工具
- `utils/jwt.ts` 签发/校验
- `utils/password.ts` bcrypt 封装
- `utils/auditLogger.ts` 审计写入
- `utils/logger.ts` 日志

## 提醒/通知调度链路
1. `schedulerService` 触发到期/即将到期任务
2. 写 `Notification` 表(站内)
3. 查 `PushSubscription` 决定是否发 Web Push
4. 提醒策略可在这里扩展邮件通道(需求 6)
