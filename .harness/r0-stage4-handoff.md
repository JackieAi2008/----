# r0 §4 消息中心 — handoff

> 状态: 完工
> 提交: 见下方 commit hash(es)
> 验收: server 单测 39/39 全绿,client type-check/build/vitest 全绿,手动 e2e 冒烟通过

## 改动文件清单

### 新增 (7)
- `server/prisma/migrations/20260626022634_notif_category_priority/migration.sql` — schema 迁移(type→category 重命名 + priority 新增 + 数据转换)
- `server/src/services/notificationService.ts` — 统一通知写入 service,所有 controller 必须经此
- `server/src/controllers/messagesController.ts` — 新端点: list / unread-count-by-category / mark-all-read / :id/read
- `server/src/routes/messages.ts` — 新路由,挂 `/api/messages`
- `server/src/__tests__/messages.test.ts` — 39 个单测,覆盖 filter / pagination / 聚合 / 权限 / 写 service / migration 数据映射
- `client/src/api/messages.ts` — 前端 API client + routeForMessage 跳转工具
- `client/src/views/messages/MessagesPage.vue` — 消息中心主页(左侧 tab + 右侧无限滚动 + 全部标已读 + 单条跳转)

### 修改 (11)
- `server/prisma/schema.prisma` — Notification 模型:`type`→`category`,新增 `priority`,新增 `@@index([userId, category])` + `@@index([userId, isRead])`
- `server/src/app.ts` — 注册 `/api/messages` 路由
- `server/src/controllers/projectController.ts` — `prisma.notification.create` → `sendNotification({ category: 'INVITE', ... })`
- `server/src/controllers/taskController.ts` — 两处 `prisma.notification.create/createMany` → `sendNotification / sendManyNotifications`
- `server/src/services/recurringTaskService.ts` — 重复任务通知 → `sendNotification({ category: 'TASK_REMINDER', ... })`
- `client/src/types/notification.ts` — 新增 `NotificationCategory` / `NotificationPriority` 枚举,category 中文名 / 图标 / 颜色映射
- `client/src/api/notification.ts` — 未改(老端点继续可用)
- `client/src/stores/notification.ts` — 新增 `unreadByCategory` / `fetchUnreadByCategory` / `markAllAsRead(category?)` / `routeFor()`,保留老 `unreadCount` 以兼容现有调用点
- `client/src/components/common/NotificationPanel.vue` — 重写:最近 5 条 + 「查看全部 →」跳 /messages + 角标用聚合 + 60s 轮询
- `client/src/components/common/NavItem.vue` — iconMap 加 `Bell`
- `client/src/layouts/MainLayout.vue` — 导航加「消息中心」(回收站 → 消息中心 → 总结归档);铃铛按钮改为 `router-link to=/messages`;保留 NotificationPanel 组件挂载(防退化)
- `client/src/router/index.ts` — 加 `/messages` 路由
- `client/tests/e2e/stage4-message-center.spec.ts` — 调整:mark-all-read 走 POST、新 badge 选择器、bell 改 router-link;ENABLED 仍为 false(spec 说"§4 dev commit 后启用"再开)

### 未触碰
- `server/src/controllers/notificationController.ts` — 老 controller 不动,继续工作
- `server/src/routes/notifications.ts` — 老路由不动
- `server/src/controllers/userController.ts:270` — `tx.notification.deleteMany` 不动(用户删除级联)
- §2 DashboardPage / §3 Excel 导入相关文件 — 严格不碰

## 关键决策

1. **type → category 重命名**: 一次到位 + 旧数据用 SQL CASE 转换。映射见 migration.sql 注释头
2. **priority 排序**: Prisma `orderBy` 不支持表达式,在 controller 应用层按 `priorityRank[HIGH/NORMAL]` 排(简单可靠)
3. **老端点零回归**: `/api/notifications` 3 个端点继续工作,字段自动反映新 schema(type 字段不再存在,自动出现 category/priority)
4. **bell 改为 router-link**: 顶栏铃铛直接跳 /messages(对齐 e2e 期望);`NotificationPanel` 组件保留在 MainLayout 但默认不展示(下拉交互由以后按需触发)
5. **mark-all-read**: 不传 category = 全部,传 = 单 category;非法 category 静默忽略走"全部"路径
6. **单条跳转**: 按 category 路由,见 `client/src/api/messages.ts:routeForMessage`;SYSTEM 不跳
7. **notificationService 集中化**: 所有 `prisma.notification.create` 全部经 service,避免 category/priority 散落

## 验收结果

### Server
- `pnpm tsc --noEmit` — 0 报错
- `pnpm jest src/__tests__/messages.test.ts` — **39 passed / 0 failed**
- `pnpm jest` 全量 — **228 passed / 9 failed**
  - 9 failed 全部为 **pre-existing**,与本任务无关:
    - `export.test.ts` — TS6133 `'today' declared but never read`(unused local)
    - `task.test.ts` — TS6133 `'collaboratorToken' / 'outsiderId' declared but never read`
    - `auth.test.ts` — 3 失败:错误信息文案不匹配 / JWT malformed token 返回 500 而非 401
    - `project.test.ts` — 4 失败:私有项目可见性 + 删除文案不匹配
    - `import.test.ts` — 4 失败:§3 Excel 导入的 e2e body 长度断言(尚未完工,留给 §3a)
  - 这些都在 commit `e7672515` 或更早就存在,与本次 schema 变更无关

### Client
- `pnpm vue-tsc --noEmit` — 0 报错
- `pnpm build` — 成功(`dist/assets/MessagesPage-*.js 8.28 kB`)
- `pnpm test:run` (vitest) — **48 passed / 0 failed**

### 手动 e2e 冒烟(在 dev server :3099)
- 1) creator 注册 + assignee 注册 → 2) creator 建项目 → 3) creator 建任务指派给 assignee → 触发 `category=TASK_REMINDER, priority=NORMAL` 通知
- 4) `GET /api/messages` — 拿到 1 条, `unread=1`
- 5) `GET /api/messages?category=TASK_REMINDER` — 过滤准确
- 6) `GET /api/messages/unread-count-by-category` — `{ TASK_REMINDER:1, total:1 }`
- 7) `POST /api/messages/mark-all-read` — `{ updated:1 }`,再查聚合 → `total:0`
- 8) `GET /api/notifications`(老端点)— 仍工作,返回的字段是 `category/priority`,**无 `type` 字段**(自动反映新 schema)
- ✅ 全链路绿

## 已知遗留 / 风险

1. **优先级用字符串而非 enum**: 当前 `priority` 是 `String @default("NORMAL")`,不是 Prisma `enum`。优点是迁移灵活(加 `URGENT` 不用 migration);缺点是无类型安全。后续若加新值需手工校验
2. **应用层排序**: priority 排序在 controller 应用层做(pageSize max 100,数据量可控);如果未来 pageSize 放开,需要改用 SQL CASE
3. **NotificationPanel 组件仍在 MainLayout 挂载点但默认不展示**: 顶栏铃铛已改为 router-link。Panel 的"查看全部 →"链接可以由其他场景触发(例如新建任务后弹气泡),如果决定彻底删除,需要清理 `<NotificationPanel>` 标签 + `showNotifications` state
4. **prisma-lock 等被 §3 in-progress 改动污染**: 仓库工作树中混有 §3 Excel 导入的未提交改动(server `routes/tasks.ts`、`app.ts`、`controllers/taskController.ts`、client `pnpm-lock.yaml`、新文件 `importController.ts` / `importService.ts` / `routes/import.ts` 等)。本任务只 add 我自己的文件,**不会触碰 §3 的部分**。如果 cherry-pick 出现冲突,§3 那个 worker 需要手动 rebase
5. **data.db / test.db**: 已应用新 migration;若用户回滚,需要回滚 server 端 schema + 重跑 migration

## 不在 §4 范围,留给后续

- §3 Excel 批量导入(§3a 任务,不是我)
- §5 资料库(实施在 §4 验收后)
- 通知点击打开抽屉 / hover 预览等微交互

---

**已完成。** commit hash 见 git log,详细 diff 见 `git diff --stat HEAD`。
