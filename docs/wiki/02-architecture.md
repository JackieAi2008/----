# 02 架构(Architecture)

## 技术栈
- 前端:Vue 3 + Vite 5 + TypeScript 5 + Tailwind 3 + Pinia 2 + Vue Router 4 + Axios + ECharts 5
- 后端:Node 20 + Express 4 + TypeScript 5 + Prisma 5 + SQLite 3 + JWT + bcryptjs
- 推送:Web Push(VAPID)
- AI:Deepseek(`server/src/config/deepseek.ts`),由 `aiSummaryService.ts` 调用

## 进程边界
```
[Vue 3 SPA] --(Axios)--> [Express API] --(Prisma)--> [SQLite]
        |                        |
        |<-- Web Push (VAPID)----|
        |<-- SSE/长轮询由通知接口提供
```

## 关键约定
- API 前缀统一为 `/api/...`
- 后端 ESM + TS,使用 `.js` 导入路径(由 `tsx`/`tsc` 处理)
- 中间件链:`auth` → `validate` → `requireTaskPermission` → 控制器
- 错误统一走 `middlewares/errorHandler.ts`
- 审计日志走 `utils/auditLogger.ts`(登录、关键写操作)

## 部署形态
- 单体 Express + 单库 SQLite(本地/小团队)
- 反向代理可选 Nginx;PM2 进程守护(README 给出样例)
- 前端 `pnpm build` 产物可由 Nginx 静态托管或与 API 同源反代
