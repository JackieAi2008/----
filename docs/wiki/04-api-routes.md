# 04 API 路由(Routes)

> 来源:`server/src/routes/*.ts`。所有路由都挂在 `/api` 前缀下,经过 `app.ts` 装配。

## 认证
- `POST /api/auth/register` 公开
- `POST /api/auth/login` 公开
- `POST /api/auth/forgot-password` 公开
- `POST /api/auth/reset-password` 公开
- `GET  /api/auth/me` 已登录

## 用户
- `GET    /api/users` 列表(管理员)
- `GET    /api/users/search?q=` 跨部门搜索
- `GET    /api/users/:id`
- `PUT    /api/users/:id`
- `PUT    /api/users/:id/status` 启停(管理员)
- `DELETE /api/users/:id`(管理员)
- `POST   /api/users/:id/transfer-admin` 转让超管
- 部门管理:`GET /api/users/department/members`、`POST /:id/transfer-department-admin`、`DELETE /:id/department`、`PUT /:id/department-status`

## 项目
- `GET/POST /api/projects`
- `GET/PUT/DELETE /api/projects/:id`
- 邀请:`POST /api/projects/:id/invite`、`POST /api/projects/:id/accept-invite`、`POST /api/projects/:id/decline-invite`

## 任务(最重)
- `GET/POST /api/tasks`
- `GET    /api/tasks/categories`
- `POST   /api/tasks/categories`
- `GET    /api/tasks/deliverable-options`
- `POST   /api/tasks/deliverable-options`(管理员)
- `DELETE /api/tasks/deliverable-options/:id`(管理员)
- `GET    /api/tasks/tags`
- `GET    /api/tasks/archived`
- `PUT/DELETE /api/tasks/batch` 批量更新/删除
- `POST   /api/tasks/batch/archive` 批量归档
- `POST   /api/tasks/archive-completed` 自动归档(>30天已完成)
- `GET    /api/tasks/:id`
- `PUT    /api/tasks/:id`
- `DELETE /api/tasks/:id`
- `PUT    /api/tasks/:id/status` 状态流转
- `GET    /api/tasks/:id/activity` 活动流
- 评价:`GET/POST /api/evaluations` / `GET /api/evaluations/task/:taskId`

## 部门
- `GET/POST/PUT/DELETE /api/departments` + 成员/可见性/统计子接口

## 日历
- `GET /api/calendar/tasks?from=&to=&view=month|week|day`
- `GET /api/calendar/today`
- `GET /api/calendar/upcoming`

## 概览/报表
- `GET /api/dashboard/overview`
- `GET /api/dashboard/today`
- `GET /api/dashboard/upcoming`
- `GET /api/reports/*` 报表页

## 通知
- `GET    /api/notifications`
- `GET    /api/notifications/unread-count`
- `POST   /api/notifications/:id/read`
- `POST   /api/notifications/read-all`
- `DELETE /api/notifications/:id`

## 推送
- `GET  /api/push/vapid-public-key`
- `POST /api/push/subscribe`
- `POST /api/push/unsubscribe`
- `GET  /api/push/status`
- `POST /api/push/test`

## 其他
- 标签、模板、附件、搜索、导出、AI 总结、健康检查(`/api/health`)均有独立路由
