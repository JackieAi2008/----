# 中集智历 — 反馈迭代 r0 实施计划

> 起止:2026-06-24 起草
> 输入:`D:\Program Files (x86)\Tencent\WeChat\xwechat_files\IBC2008_abf3\msg\file\2026-06\中集智历.docx` + 4 张截图
> 输出对齐:`docs/wiki/`(项目 wiki)
> 邮件通道**本轮不实施**,留作 P2 留口子(见 §6 决策记录)

## 0. 需求清单(已与用户对齐)

| # | 需求 | 本计划归属 | 备注 |
|---|------|------------|------|
| 1 | 项目详情删除「核心工作」,只留「关键节点」 | 阶段 1 | UI 改造,数据保留 |
| 2 | 「进展跟踪」→「工作总结」(负责人写)、「评论」→「工作评价」(尹主任写)、归档 + AI 总结 | 阶段 1 | 复用 `Task.completionNote` + `Evaluation` + `aiSummaryService` |
| 3 | 概览看板改年度(自然年) | 阶段 2 | 4 张年度卡 + 年度切换器 |
| 4 | 任务批量导入(Excel 模板) | 阶段 3a/3b/3c | 后端生成带下拉的活模板,结构化解析,事务写库 |
| 5 | 资料库(只图片) | 阶段 5 | `LibraryAsset` 新表 + 资料库页 + 上传/预览/下载 |
| 6 | 邮件提醒 | **本轮不做**(P2) | 改走方案 A:强化消息中心 |
| 7 | 「负责人下拉里没有王田」 | 阶段 1 | 补 `User` 行,非功能开发 |

## 1. 阶段 0 — 基线(0.5 天)

**目标**:确认基线干净、基线测试可跑、基线构建通过。

**任务**
- [ ] 拉代码(若需要)
- [ ] `cd server && pnpm install`
- [ ] `cd client && pnpm install`
- [ ] `pnpm prisma:generate && pnpm prisma:migrate && pnpm db:seed`
- [ ] `pnpm --filter server test` 通过
- [ ] `pnpm --filter client test` 通过(目前只看到 `stores/auth.test.ts`)
- [ ] `cd server && pnpm build` 通过
- [ ] `cd client && pnpm build` 通过
- [ ] `git diff --check` 无 CRLF/空白符告警

**沙箱注意**:Codex 桌面沙箱在 Windows 上目前 `codex.exe` 报 `Access is denied`、Word COM 报 `0x80070520`。运行类命令若失败,会改为「代码静态审查 + 让你手动跑一次」并把结果贴回。

**完成定义**:`docs/plans/2026-06-24-zjzl-feedback-r0-baseline.md` 写明基线状态(测试数 / 构建产物大小 / 任何已知脏数据)。

## 2. 阶段 1 — UI 收口 + 评价闭环 + 补王田(1~2 天,覆盖需求 1/2/7)

**后端**
- [ ] `Task.completionNote` 已有,补「工作总结」专用接口
  - `POST /api/projects/:id/summaries` 写入
  - `GET  /api/projects/:id/summaries` 列表
  - `POST /api/projects/:id/summaries/:id/ai-summary` 触发 `aiSummaryService`
- [ ] 「工作评价」走 `Evaluation` 表
  - 在 `taskPermission.ts` 加 `TaskAction.EVALUATE` —— 限定 `DEPT_ADMIN` 角色(尹主任)或显式 `evaluatorId` 名单
  - 复用现有 `GET/POST /api/evaluations` 和 `GET /api/evaluations/task/:taskId`
- [ ] 「王田」补用户:管理端在 `UserManage.vue` 加按钮 + `POST /api/users` 已存在,直接走

**前端**
- [ ] `views/project/ProjectDetail.vue`
  - 删除「核心工作」section(关键节点保留)
  - 「进展跟踪」改名为「工作总结」,作者限定为项目负责人本人
  - 「评论」改名为「工作评价」,作者限定为指定评价人(默认 DEPT_ADMIN)
  - 新增「AI 总结」按钮,调用 `/projects/:id/summaries/:id/ai-summary`
- [ ] `views/admin/UserManage.vue`
  - 确认「新建用户」表单字段完整,补王田账号

**验收**
- [ ] 项目详情只显示「关键节点」+「工作总结」+「工作评价」+「交付成果」4 块
- [ ] 负责人提交工作总结 → AI 总结按钮可见 → 输出有效总结文本
- [ ] 尹主任登录 → 项目详情 → 看到「工作评价」入口
- [ ] 「王田」出现在「新建任务」负责人下拉里
- [ ] `pnpm --filter server test` 仍全绿,新增至少 3 条单测(`summaries` 路由、Evaluation 权限、User 创建)

**风险**
- `Comment` 表跟 `Evaluation` 重叠:旧数据保留只读,UI 上隐藏「普通评论」入口
- AI 总结调用 Deepseek 失败时降级为「总结文本直接展示」,不阻塞

## 3. 阶段 2 — 概览年度看板(1~2 天,覆盖需求 3)

**后端**
- [ ] 新增 `GET /api/dashboard/yearly?year=2026`,返回
  ```ts
  {
    year: 2026,
    yearlyTotal: number,        // 全年任务(我参与/可见)
    yearlyTodo: number,         // 全年待办(status=非 DONE/CANCELLED)
    yearlyOverdue: number,      // 全年逾期(dueDate < now && status != DONE)
    yearlyDone: number,         // 全年已完成
    byMonth: Array<{ month: 1..12, total: number, done: number }>
  }
  ```
- [ ] 性能:`Task` 已有索引 `assigneeId + status + dueDate`;若慢,加 `@@index([assigneeId, dueDate])`
- [ ] 限流:`rateLimiter` 已存在,无需新增

**前端**
- [ ] `views/dashboard/DashboardPage.vue`
  - 顶部新增 4 张年度大卡(默认 2026)
  - 「年度切换」下拉(2024/2025/2026)
  - 保留「今日/逾期/本周」为次级快捷入口(折叠)

**验收**
- [ ] 4 张年度卡数据与后端 SQL 一致(手算 3~5 个 case 对比)
- [ ] 切换 2024 / 2025 / 2026 ≤ 1.5s 出数
- [ ] 「无任务的年份」返回 0,不报错

**风险**
- 大数据量用户(全年 > 1k 任务)首屏可能慢:`yearlyTotal` 加 10000 上限返回 +「查看全部」分页

## 4. 阶段 3 — 任务批量导入(2~3 天,覆盖需求 4)

### 3a 后端模板生成 + 解析预览(1 天)
- [ ] 依赖:`pnpm --filter server add exceljs` + `@types/exceljs`
- [ ] `GET /api/import/templates/tasks.xlsx` — 接口动态生成,带 4 个下拉(项目 / 负责人 / 优先级 / 交付成果)
- [ ] `POST /api/tasks/import/preview` — 接收 xlsx,返回
  ```ts
  {
    valid: Array<{ row: number, parsed: TaskInput }>,
    invalid: Array<{ row: number, errors: string[] }>
  }
  ```
- [ ] 解析层单独抽出 `server/src/utils/taskImportParser.ts`,便于 3b 复用

### 3b 写库 + 事务 + 失败报告(1 天)
- [ ] `POST /api/tasks/import` — preview 通过后调用
  - 单一 Prisma `$transaction`,任一行失败整批回滚
  - 失败时返回 `{ failed: number, errors: Array<{row, message}> }`,前端可下载 `.xlsx` 失败报告
- [ ] 单测覆盖:空文件 / 全部失败 / 部分失败 / 全成功 / 事务回滚

### 3c 前端对话框(0.5 天)
- [ ] `views/task/ArchivedTasks.vue` 同级新增「批量导入」入口(放在导航 / 项目详情 / 任务页头部三选一,默认导航)
- [ ] `components/task/TaskImportDialog.vue` — 4 步骤向导
  1. 下载模板
  2. 上传 Excel
  3. 预览成功/失败行
  4. 确认导入
- [ ] 失败报告可下载

**验收**
- [ ] 100 行 Excel ≤ 5s 导入
- [ ] 故意制造 1 行错误 → 整批回滚 → 数据库无任何新行
- [ ] 失败行可下载 .xlsx,定位精确到单元格

**风险**
- Excel 解析兼容性:macOS Numbers 导出的 xlsx 列类型有时是字符串而非数字,parser 要宽松
- 大文件(>10MB):前端 `multer` 内存模式可能爆,改 `diskStorage` + 流式解析

## 5. 阶段 4 — 消息中心(2~3 天,覆盖需求 6 方案 A)

**后端**
- [ ] `Notification` 表增字段:`category`(TASK_REMINDER/INVITE/EVALUATION/MENTION/SYSTEM)、`priority`(NORMAL/HIGH)
- [ ] `migration`:`pnpm prisma migrate dev --name notif_category_priority`
- [ ] `GET /api/messages?category=&priority=&read=&page=` 新接口
  - 区别于 `GET /api/notifications`(老接口保留)
- [ ] `GET /api/messages/unread-count-by-category` — 角标用
- [ ] 现有 `notificationService` 写入时补 `category`

**前端**
- [ ] 新路由 `/messages`,`views/messages/MessagesPage.vue`
- [ ] 左侧 Tab:全部 / 任务提醒 / 邀请 / 评价 / @我 / 系统
- [ ] 顶部未读红点(按 category 聚合)
- [ ] `components/common/NotificationPanel.vue` 现有下拉铃铛改跳 `/messages`(保留下拉的"最近 5 条")
- [ ] 「全部标记已读」按钮

**验收**
- [ ] 切到任意 Tab,只显示对应 category
- [ ] 标已读后,未读数减少,DB 同步
- [ ] 移动端布局不破(只读,不专门做响应式)

**风险**
- 现有 `Notification` 已有 `type` 字段(枚举?字符串?需要查代码),与新 `category` 字段不重复:
  - 若 `type` 是字符串,直接重命名为 `category`
  - 若 `type` 是 enum,新增 `category`,写迁移兼容

## 6. 阶段 5 — 资料库(2~3 天,覆盖需求 5)

(本阶段计划细节,等阶段 4 完成后补,这里先列骨架)

- [ ] `LibraryAsset { id, title, fileUrl, mimeType, sizeBytes, ownerId, projectId?, tags, visibility, createdAt }`
- [ ] `multer` 上传,mime 限制 `image/*`,默认 10MB
- [ ] `GET /api/library` 列表 / `GET /api/library/:id` 详情 / `GET /api/library/:id/file` 下载
- [ ] 导航新增「资料库」入口
- [ ] 仅图片预览,不做文档类

## 7. 决策记录(本轮)

| 决策点 | 决定 | 理由 |
|--------|------|------|
| 「年度」口径 | 自然年 | 概念清晰、查询简单 |
| 批量录入 | Excel 模板,后端动态生成 | 收敛字段、避免解析歧义 |
| 邮件提醒 | 本轮**不做**,走方案 A 消息中心 | 0 依赖、立即上线;邮件作 P2 |
| 「王田」补法 | 走 `POST /api/users` 标准接口 | 数据修复,非功能 |
| `Comment` vs `Evaluation` | 评价走 `Evaluation`,旧 `Comment` 数据保留只读 | 不破坏历史 |

## 8. 风险登记

| 风险 | 触发 | 缓解 |
|------|------|------|
| Prisma migration 漂移 | 阶段 4、5 加字段 | 每次单独 migration,SQL 单独 commit |
| SMTP 凭据不可用 | 阶段 5(下期 P2) | 不在本轮 |
| ExcelJS 与现有依赖冲突 | 阶段 3a | `pnpm why exceljs` 提前确认 |
| 通知旧 `type` 字段语义不清 | 阶段 4 开工前先看代码 | 在阶段 4 计划里先做"字段语义审计"小任务 |

## 9. 不在本轮范围

- 邮件通道(方案 B)
- Word/PDF 智能解析(阶段 3d)
- 移动端响应式
- 国际化(i18n)
- 单点登录 / OAuth
