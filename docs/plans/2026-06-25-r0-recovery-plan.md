# 中集智历 — R0 恢复计划 (2026-06-25)

> 起止:2026-06-25 起草
> 输入:
> - `docs/plans/2026-06-24-zjzl-feedback-r0-baseline.md`(阶段 0b 基线)
> - `docs/plans/2026-06-24-zjzl-feedback-r0-plan.md`(旧 plan,阶段 1 commit `18ea998b`)
> - `docs/plans/2026-06-25-r0-prod-audit.md`(T1 部署审计,核心结论:**R0 阶段 1 在生产 100% 未生效**)
> 输出对齐:`docs/wiki/`(项目 wiki)
> 邮件通道**本轮不实施**,留作 P2(见 §0 决策记录)

---

## 0. 决策点(已与用户对齐,本轮确认/更新)

| # | 决策点 | 决定 | 理由 | 与本轮关系 |
|---|--------|------|------|------------|
| D1 | 「年度」口径 | **自然年 (1/1 ~ 12/31)** | 概念清晰、与"年度总结"业务术语一致;SQL 走 `dueDate BETWEEN YYYY-01-01 AND YYYY-12-31 23:59:59` | 阶段 2 直接采用,无需再问 |
| D2 | 批量录入方式 | **Excel 模板,后端动态生成 + 4 步向导** | (a) 后端生成模板收敛字段、避免字段漂移;(b) 4 步向导分步降错;(c) 事务回滚 + 失败报告可控 | 阶段 3 直接采用,无需再问 |
| D3 | 通知渠道 | **方案 A:消息中心 (Notification 表 + MessagesPage)**;邮件走 P2 | 邮件需要 SMTP 凭据 + 模板,本轮不阻塞;消息中心改动面小、上线快 | 阶段 4 直接采用,无需再问 |
| D4 | 「王田」补法 | **走 `POST /api/users` + 手工 `ProjectMember` 写入**;脚本名 `add-wangtian-to-projects.cjs` | 数据修复,非功能;王田在 User 表已存在,只需补 5 个核心项目成员 | **本轮更新**:脚本在阶段 1.5 部署时一起跑;前端下拉本期不动(已在 baseline 决策) |
| D5 | `Comment` vs `Evaluation` | **评价走 `Evaluation` 表,旧 `Comment` 数据保留只读** | 旧评论不能丢;新评价用 `Evaluation` 走权限闭环;UI 上隐藏「普通评论」入口 | 阶段 1.5 验证时一并核对 `Comment` 是否还在被读 |

> 本轮**不新增**决策点;若阶段 2-5 推进中发现新岔路,先在 `docs/plans/2026-MM-DD-<topic>.md` 写方案,再回来更新本表。

---

## 1. 阶段 1 收口评估(基于 audit 报告)

### 1.1 结论(必须正视)

> **R0 阶段 1 在生产 100% 未生效。**本地代码层(commit `18ea998b`)完整,但生产 ECS 上的物理状态与 baseline 一致,**未发生任何 18ea998b 应有的变更**。

证据链(摘自 `2026-06-25-r0-prod-audit.md`):

| # | 证据 | 期望(18ea998b 后) | 实际 |
|---|------|-------------------|------|
| E1 | 新端点 `GET /api/projects/:id/summaries` | 401 (路由挂载,JWT 未过) | **404** (路由不存在) |
| E2 | 新端点 `POST /api/tasks/:id/ai-summary` | 401 | **404** |
| E3 | 新端点 `POST /api/users` | 401 | **404** |
| E4 | `ProjectSummary` 表 | 已存在 | **不存在**(`sqlite_master` 空) |
| E5 | `prisma/migrations/20260625000000_add_project_summary` | 已 apply | **目录不存在** |
| E6 | `dist/app.js` mtime | ≥ 6/25 13:21 (commit 时间) | **6/9 17:27:44** (旧 dist) |
| E7 | 王田进入 5 个核心项目 | 5 个项目 × 1 行 = 5 行 | **0 行** |

### 1.2 老端点无回归(audit 已验证)

- `/api/health` → 200
- `/api/projects` → 401
- `/api/dashboard/ai-summary` → 401
- `/api/evaluations/task/:id` → 401
- PM2 `zjzl-calendar` online 8D,进程活着

→ 阶段 1 的"破坏性"不在生产,生产仍跑 6/9 旧代码;唯一"变化"是用户期待落空。

### 1.3 不可绕过的隐含事实

- **生产 db mtime = 6/17 16:19**:期间 8 天无写入,旧 dist 没改 db,生产 db 与本地 db 仍可能一致(还没核),但**任何对 db schema 的操作必须先 backup**
- **生产 server 目录 mtime = 6/25 13:23**:今天有人 rsync 过文件,但**只 sync 了部分**(只动了 server/ 上层,dist/、prisma/migrations/ 没动)
- **上一轮 AI 提交了"已部署"声明但产物全无**:这意味着**信任链断了** — 本轮必须用"端点 HTTP 码 + DB 表清单 + 关键脚本副作用"三件套验证,不能只看 commit hash

### 1.4 阶段 1 验收状态(更新)

| 验收项(原 plan §2) | 本轮判定 | 原因 |
|--------------------|----------|------|
| 项目详情 4 块结构 | **未核实** | 旧 dist 在跑,新代码未生效;需要在阶段 1.5 重新部署后,本地 5173 联调 |
| 工作总结 → AI 总结按钮 | **未核实** | 同上;且 AI 总结依赖 DeepSeek API,需联调 |
| 尹主任看到「工作评价」 | **未核实** | 旧 dist 上 Evaluation 写入仍只允许 `isAdmin=true`,权限改动未生效 |
| 王田出现在下拉 | **未核实** | DB 层面王田未进 ProjectMember;前端下拉仍看不到 |
| 后端测试仍全绿 + 新增 ≥3 单测 | **未核实** | 旧 dist 上的测试是基于旧代码的,新代码未部署 |

→ 阶段 1 在**生产层 0/5 验收通过**,在**代码层 5/5 commit 完成**。本轮必须做"阶段 1.5 部署抢救",把代码层 → 生产层补齐。

---

## 2. 阶段 1.5 — 阶段 1 部署抢救(新增,阻塞性,0.5-1 天)

> 命名说明:不是"重做阶段 1",而是"补上阶段 1 的部署动作"。
> 没有这个阶段,阶段 2-5 的所有新代码都建在**未生效的阶段 1** 之上,无意义。

### 2.1 后端 / 部署脚本

| 任务 | 验收标准 | 角色 |
|------|----------|------|
| 写 `server/scripts/deploy-stage1.sh` | (1) 幂等,二次跑不报错;(2) 步骤可单步执行(`SKIP_RSYNC=1` / `SKIP_BUILD=1` 等开关);(3) 每步失败 `set -e` + 明确报错行号 | zjzl-dev |
| 写 `server/scripts/rollback-stage1.sh` | (1) 备份当前 dist/ 命名为 `dist.bak.<timestamp>`;(2) 备份当前 db 为 `data.db.bak.<timestamp>`;(3) `pm2 restart` 回到上次 commit | zjzl-dev |
| 写 `server/scripts/probe-stage1.sh` | 7 个端点 + 1 个表清单 + 1 个王田项目成员查询,**任一 FAIL 直接 exit 1**;输出 JSON 报告 | zjzl-dev |

### 2.2 沙箱演练(必做,不可省)

| 任务 | 验收标准 | 角色 |
|------|----------|------|
| 在本机或 Docker 起一个**生产同构**环境(Ubuntu 24.04 / Node 20.20 / SQLite) | `cat /etc/os-release` 一致;`node -v` 一致 | zjzl-deploy |
| 跑 `deploy-stage1.sh` 一次 | 全部 PASS,probe 7/7 端点 401(非 404)、ProjectSummary 表存在、王田 5 行 ProjectMember | zjzl-deploy |
| 跑 `rollback-stage1.sh` 一次 | 进程重启后 probe 退回 baseline(3 个新端点 404、ProjectSummary 缺失、王田 0 行) | zjzl-deploy |
| 写 `server/docs/deploy-runbook.md` | 步骤截图 + 期望输出 + 排错 checklist | zjzl-deploy |

### 2.3 ECS 真实部署

| 任务 | 验收标准 | 角色 |
|------|----------|------|
| `ssh root@118.178.120.99` 后用 `deploy-stage1.sh` 跑 | probe 7/7 端点:3 新端点返回 401(说明路由挂载),4 老端点不变 | zjzl-deploy |
| 手动核 `sqlite3 data.db ".tables"` | 出现 `ProjectSummary` | zjzl-deploy |
| 手动核 `SELECT count(*) FROM ProjectMember WHERE userId = (SELECT id FROM User WHERE email='wangtian@cimc.com')` | = 5 | zjzl-deploy |
| 记录 `data.db` 备份到 `prisma/data.db.bak.<timestamp>` 并把备份路径写到 audit 报告 | 路径可访问 | zjzl-deploy |
| 在 `docs/plans/2026-MM-DD-stage15-deploy-report.md` 写完整部署证据(端点码、SQL 输出、pm2 logs 末尾 50 行) | 报告存在且可追溯 | zjzl-deploy |

### 2.4 阶段 1.5 验收

- [ ] `server/scripts/deploy-stage1.sh` 落 git,行数 ≥ 50,带 `--dry-run` / `--step` 开关
- [ ] `server/scripts/rollback-stage1.sh` 落 git,带 `--to <tag>` 选项
- [ ] `server/scripts/probe-stage1.sh` 落 git,7+1+1 断言全 PASS
- [ ] `server/docs/deploy-runbook.md` 落 git,含 Ubuntu 24.04 同构环境 + ECS 真机 2 套演练记录
- [ ] ECS 真实部署后 `data.db` mtime > 部署触发时间
- [ ] 三个新端点 curl 全部返回 401(不是 404)
- [ ] `ProjectSummary` 表存在,有 4 个列(`id / projectId / period / content`,具体以本地 schema 为准)
- [ ] 王田在 5 个核心项目里都是成员
- [ ] zjzl-pm 收到部署报告后,update 本计划文件 §1.4,把"未核实"全部改为"已核实 PASS"

### 2.5 依赖与串并

- **串行**:`deploy-stage1.sh`(zjzl-dev)→ 沙箱演练(zjzl-deploy)→ ECS 真机(zjzl-deploy)→ 验收(zjzl-pm)
- **不与任何其他阶段并**:阶段 1.5 是后续所有阶段的输入

### 2.6 风险与缓解

| 风险 | 触发条件 | 缓解 |
|------|----------|------|
| `npx prisma migrate deploy` 在生产报 drift | 线上 migration 与 schema 不同步 | 跑前先 `prisma migrate status`;若 drift,手动 `prisma migrate resolve` 标记 baseline(但需先 backup db) |
| `add-wangtian-to-projects.cjs` 报主键冲突 | 脚本被误跑两次 | 脚本里加 `INSERT OR IGNORE` 或 `WHERE NOT EXISTS` |
| 旧 dist 被新 dist 覆盖后服务起不来 | 编译失败 / 依赖缺失 | `deploy-stage1.sh` 编译失败 `exit 1`,不覆盖;`rollback-stage1.sh` 5 分钟内可回 |
| DeepSeek API 在 AI 总结按钮上 500 | 网络或配额 | `aiSummaryService` 已有降级逻辑;UI 上显示"AI 总结暂不可用,请手动填写" |
| rsync 把 `node_modules` 覆盖,二进制不兼容 | 跨 CPU 架构(本项目同架构概率极低) | deploy 脚本明确 `--exclude node_modules` |
| **新增**:AI 之前承诺的"已部署"假象 | 历史已发生 | 验证必须基于**实际产物**(端点码、DB 表、SQL 行数),不是 commit hash |

---

## 3. 阶段 2 — 概览年度看板(1-2 天,覆盖需求 3)

> 前置:阶段 1.5 验收通过(`ProjectSummary` / 王田 / 端点码全 PASS)

### 3.1 后端

| 任务 | 验收标准 | 角色 |
|------|----------|------|
| `GET /api/dashboard/yearly?year=2026` | 返回结构见下;权限校验走 `auth` 中间件;`year` 必填且 `2000 ≤ year ≤ 2100` | zjzl-dev |
| 接口实现放 `server/src/controllers/dashboardController.ts` 的 `getYearlyDashboard` | 单文件改动,无新依赖 | zjzl-dev |
| SQL 走 `prisma.task.findMany` + 内存聚合;`dueDate` 用 `gte` / `lt` 限定自然年;`status` 用 `not in [DONE, CANCELLED]` | 1000 任务用户 P95 < 500ms | zjzl-dev |
| 限流复用现有 `rateLimiter` | 无新增 | zjzl-dev |

返回结构:

```ts
{
  year: 2026,
  yearlyTotal: number,        // 全年任务(我参与/可见)
  yearlyTodo: number,         // 全年待办
  yearlyOverdue: number,      // 全年逾期
  yearlyDone: number,         // 全年已完成
  byMonth: Array<{ month: 1..12, total: number, done: number }>
}
```

### 3.2 前端

| 任务 | 验收标准 | 角色 |
|------|----------|------|
| `views/dashboard/DashboardPage.vue` 顶部新增「年度看板」section | 4 张大卡 + 年度切换器,默认 2026 | zjzl-dev |
| 新组件 `components/dashboard/YearlyCard.vue` | 接受 `{label, value, accent}` props,clamp 0~9999 显示 | zjzl-dev |
| 新组件 `components/dashboard/MonthlyBar.vue` | 12 列迷你柱,按月聚合;ECharts or SVG 自绘二选一(优先 SVG,体积小) | zjzl-dev |
| 「年度切换」下拉(2024/2025/2026) | `v-model="year"`,切换后自动 refetch;loading 态显示骨架 | zjzl-dev |
| 保留「今日/逾期/本周」为次级快捷入口(可折叠) | 默认折叠,点开才显示 | zjzl-dev |

### 3.3 测试

| 任务 | 验收标准 | 角色 |
|------|----------|------|
| 后端 `src/__tests__/dashboard.yearly.test.ts` | (a) 空年份返回 0;(b) 跨年任务不串;(c) 权限 401 | zjzl-test |
| 前端手测 + 截图 | (a) 2024 / 2025 / 2026 ≤ 1.5s 出数;(b) 空年份不报错;(c) 4 张卡数据与后端 SQL 一致(3-5 case 对比) | zjzl-test |
| E2E(可选,Playwright 跑一次) | 年度切换 + 折叠展开 | zjzl-test |

### 3.4 阶段 2 验收

- [ ] 4 张年度卡显示正确(手算 3-5 个 case 对比一致)
- [ ] 切换 2024 / 2025 / 2026 ≤ 1.5s 出数
- [ ] 「无任务的年份」返回 0,不报错
- [ ] 移动端(只读)不破版
- [ ] 后端测试新增 ≥2 单测,全绿
- [ ] 部署到 ECS(用 `deploy-stage1.sh` 同模板,改名 `deploy-stage2.sh`),probe 新增 1 个端点 `/api/dashboard/yearly` 401

### 3.5 依赖与串并

- **前置**:阶段 1.5 完成
- **可并**:后端 `getYearlyDashboard` + 前端 4 张卡 + 前端柱图(3 个文件改,互不冲突)
- **不可省**:单测 → 部署 → 验收

### 3.6 风险与缓解

| 风险 | 触发 | 缓解 |
|------|------|------|
| 大数据量用户首屏慢 | 全年 > 1k 任务 | `yearlyTotal` 加 10000 上限 + 「查看全部」分页入口;或预聚合到 `ProjectSummary` 表(后续阶段再做) |
| 月度柱图误导 | 任务跨月显示(开始月 vs 截止月) | 当前以 `dueDate` 落月为准,UI 标"按截止月" |
| 4 个统计口径混淆 | 同期口径不一致 | 后端返回前 4 字段,前端不二次计算 |

---

## 4. 阶段 3 — Excel 批量导入(2-3 天,覆盖需求 4)

> 前置:阶段 1.5 完成;阶段 2 完成后**可并**(只共享后端工程)

### 4.1 3a 后端模板生成 + 解析预览(1 天)

| 任务 | 验收标准 | 角色 |
|------|----------|------|
| `pnpm --filter server add exceljs` + `@types/exceljs` | 安装无冲突(`pnpm why exceljs` 0 conflict) | zjzl-dev |
| `GET /api/import/templates/tasks.xlsx` | (a) 动态生成 xlsx,Content-Type `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`;(b) 4 个下拉(项目 / 负责人 / 优先级 / 交付成果);(c) 表头行高亮 | zjzl-dev |
| `POST /api/tasks/import/preview` (multipart, xlsx) | (a) 返回 `{valid: [...], invalid: [...]}`;(b) 不写库 | zjzl-dev |
| 抽 `server/src/utils/taskImportParser.ts` | 单一职责,可被 3b 复用;输入 Buffer,输出 `ParsedRow[]` | zjzl-dev |

### 4.2 3b 写库 + 事务 + 失败报告(1 天)

| 任务 | 验收标准 | 角色 |
|------|----------|------|
| `POST /api/tasks/import` | (a) 单一 `prisma.$transaction`;(b) 任一行失败整批回滚,DB 无新行;(c) 失败返回 `{failed, errors: [{row, message}]}`,前端可下载 `.xlsx` 失败报告 | zjzl-dev |
| 写 `server/src/utils/importFailureReport.ts` | 把 errors 序列化成 xlsx,定位精确到单元格 | zjzl-dev |
| 单测 `src/__tests__/task.import.test.ts` | 覆盖:空文件 / 全部失败 / 部分失败 / 全成功 / 事务回滚 | zjzl-test |

### 4.3 3c 前端对话框(0.5 天)

| 任务 | 验收标准 | 角色 |
|------|----------|------|
| `components/task/TaskImportDialog.vue` | 4 步骤向导(下载模板 → 上传 Excel → 预览 → 确认),步骤间可回退 | zjzl-dev |
| 入口放「导航 / 项目详情 / 任务页头部」三选一,默认**导航**(复用度高) | 用户无需进入项目即可导入 | zjzl-dev |
| 失败报告可下载 | 浏览器直接下 `.xlsx`,文件名带时间戳 | zjzl-dev |
| UI 走 Element Plus / Naive UI 现成组件,无新依赖 | 包大小无变化 | zjzl-dev |

### 4.4 阶段 3 验收

- [ ] 100 行 Excel ≤ 5s 导入
- [ ] 故意制造 1 行错误 → 整批回滚 → DB 无任何新行(`SELECT count(*) FROM Task` 前后一致)
- [ ] 失败行可下载 `.xlsx`,定位精确到单元格
- [ ] 后端单测 5/5 通过
- [ ] ECS 部署后 probe 新增 3 个端点:`/api/import/templates/tasks.xlsx` 200(带 auth)、`/api/tasks/import/preview` 401、`/api/tasks/import` 401

### 4.5 依赖与串并

- **前置**:阶段 1.5
- **串行**:3a(后端模板+解析)→ 3b(写库)→ 3c(前端)→ 部署
- **可并 3c 与 3b 单测**:前端开发不依赖 3b 单测通过

### 4.6 风险与缓解

| 风险 | 触发 | 缓解 |
|------|------|------|
| ExcelJS 与现有依赖冲突 | `pnpm install` 报 peer dep 错 | 提前 `pnpm why exceljs` 验证;若冲突,改用 `xlsx` 或 `node-xlsx` |
| macOS Numbers 导出的 xlsx 列类型是字符串 | parser 强类型报错 | parser 数字字段容错 `parseFloat || null`;日期字段容错 `Date(x) \|\| null` |
| 大文件 >10MB 内存爆 | 前端上传超限 | 改 multer `diskStorage` + 流式解析;前端限制 10MB(`Accept: 413` 提示) |
| 事务超时 | 1000 行 SQL 写超 30s | 分批 commit(每 100 行一 commit,但保留整体回滚逻辑) |
| 失败报告里中文乱码 | xlsx 编码 | 显式 `cell.alignment = { vertical: 'middle' }` + UTF-8 BOM |

---

## 5. 阶段 4 — 消息中心(2-3 天,覆盖需求 6 方案 A)

> 前置:阶段 1.5
> 与阶段 2/3 **可并**(只动 `Notification` 表 + 新页面,不动 Task / Project)

### 5.1 后端

| 任务 | 验收标准 | 角色 |
|------|----------|------|
| **字段语义审计**:`Notification` 现有 `type` 字段是字符串还是 enum? | 在阶段 4 开工第一天,先看 `server/src/types/notification.ts` + `prisma/schema.prisma`,在 `docs/plans/2026-MM-DD-notif-field-audit.md` 写结论 | zjzl-dev |
| `Notification` 增字段 `category` (TASK_REMINDER/INVITE/EVALUATION/MENTION/SYSTEM) + `priority` (NORMAL/HIGH) | 新增 enum,`category` 默认 `SYSTEM`,`priority` 默认 `NORMAL`;旧数据 `category` 全部置 `SYSTEM` | zjzl-dev |
| `prisma migrate dev --name notif_category_priority` | 迁移文件落 `server/prisma/migrations/2026MMDDHHMMSS_notif_category_priority/` | zjzl-dev |
| `GET /api/messages?category=&priority=&read=&page=&pageSize=` | 区别于 `GET /api/notifications`(老接口保留);分页 pageSize ≤ 100 | zjzl-dev |
| `GET /api/messages/unread-count-by-category` | 角标用,返回 `{TASK_REMINDER: 3, INVITE: 1, ...}` | zjzl-dev |
| `notificationService` 写入时补 `category` | 每处 `createNotification` 调用都加 category 参数(共查一下:5-8 处) | zjzl-dev |

### 5.2 前端

| 任务 | 验收标准 | 角色 |
|------|----------|------|
| 新路由 `/messages`,`views/messages/MessagesPage.vue` | 左侧 Tab 6 个(全部 / 任务提醒 / 邀请 / 评价 / @我 / 系统) | zjzl-dev |
| 顶部未读红点(按 category 聚合) | 数字 > 0 显示红点;99+ 显示 99+ | zjzl-dev |
| `components/common/NotificationPanel.vue` | 现有下拉铃铛改跳 `/messages`(保留下拉的"最近 5 条") | zjzl-dev |
| 「全部标记已读」按钮 | 按当前 Tab 标记;写完调用 `unread-count-by-category` 重新拉 | zjzl-dev |

### 5.3 测试

| 任务 | 验收标准 | 角色 |
|------|----------|------|
| 后端 `src/__tests__/messages.test.ts` | (a) 6 个 category 过滤正确;(b) 未读数计算正确;(c) 旧数据 `category=SYSTEM` 不丢 | zjzl-test |
| 前端手测 | (a) 切 Tab 数据正确;(b) 标已读后 DB 同步 + 角标减少 | zjzl-test |

### 5.4 阶段 4 验收

- [ ] 切到任意 Tab,只显示对应 category
- [ ] 标已读后,未读数减少,DB 同步
- [ ] 角标红点正确(在 dashboard 头部铃铛可见)
- [ ] 旧 `type` 字段保留(只读),不丢历史
- [ ] 部署后 probe 新增 2 个端点:`/api/messages` 401、`/api/messages/unread-count-by-category` 401

### 5.5 依赖与串并

- **前置**:阶段 1.5
- **与阶段 2/3 并**:后端表 / 路由独立
- **串行**:字段语义审计 → 改 schema + 迁移 → 改后端 → 改前端 → 部署

### 5.6 风险与缓解

| 风险 | 触发 | 缓解 |
|------|------|------|
| 旧 `type` 与新 `category` 重复 | 字段语义不清 | 第一天做字段语义审计,写明保留/重命名/共存方案 |
| `notificationService` 调用点散落 | 漏改 1-2 处 | 全文搜索 `createNotification` / `notification.create`,列 checklist |
| 移动端未读红点不显眼 | 体验下降 | 走现有 NotificationPanel,不专门做响应式 |

---

## 6. 阶段 5 — 资料库(2-3 天,覆盖需求 5)

> 前置:阶段 1.5
> 与阶段 2/3/4 **可并**(只新建 `LibraryAsset` 表 + 新页面)

### 6.1 后端

| 任务 | 验收标准 | 角色 |
|------|----------|------|
| 新表 `LibraryAsset { id, title, fileUrl, mimeType, sizeBytes, ownerId, projectId?, tags, visibility, createdAt }` | `prisma migrate dev --name add_library_asset` | zjzl-dev |
| `multer` 上传中间件 | mime 限制 `image/*`;默认 10MB;`diskStorage` 落 `/opt/zjzl-calendar/server/uploads/library/` | zjzl-dev |
| `POST /api/library`(上传) + `GET /api/library`(列表,带分页/筛选) + `GET /api/library/:id`(详情) + `GET /api/library/:id/file`(下载) | 4 个端点;权限校验 `auth` + 公开/私密可见性 | zjzl-dev |
| `DELETE /api/library/:id` | 仅 `ownerId` 或 `isAdmin=true` 可删;软删 or 硬删待定(默认硬删,UI 二次确认) | zjzl-dev |

### 6.2 前端

| 任务 | 验收标准 | 角色 |
|------|----------|------|
| 新路由 `/library`,`views/library/LibraryPage.vue` | 网格布局(图片卡片),顶部搜索框 + 上传按钮 | zjzl-dev |
| 导航新增「资料库」入口 | 主导航 | zjzl-dev |
| 详情弹窗 / 抽屉 | 点图片 → 弹大图 + 元数据(标题/上传人/时间/标签) | zjzl-dev |
| 移动端只读(不做响应式) | 在小屏能浏览不下拉 | zjzl-dev |

### 6.3 测试

| 任务 | 验收标准 | 角色 |
|------|----------|------|
| 后端 `src/__tests__/library.test.ts` | (a) 上传 10MB+ 拒绝;(b) 非图片拒绝;(c) 私密项目只成员可见;(d) 下载权限 | zjzl-test |
| 前端手测 | (a) 上传 / 预览 / 下载 / 删除全流程;(b) 大图加载不卡 | zjzl-test |

### 6.4 阶段 5 验收

- [ ] 上传 jpg/png/gif 成功,列表显示
- [ ] 非图片拒绝(返回 415)
- [ ] 点图片弹大图,可下载
- [ ] 删除仅 owner / admin 可操作
- [ ] 部署后 probe 4 个新端点全 401
- [ ] 文档类(.docx / .pdf)暂不预览,显示"下载查看"占位

### 6.5 依赖与串并

- **前置**:阶段 1.5
- **可与 2/3/4 并**:完全独立
- **串行**:schema + 迁移 → 上传接口 → 列表/详情/下载 → 前端

### 6.6 风险与缓解

| 风险 | 触发 | 缓解 |
|------|------|------|
| 存储爆盘 | 上传不限制 | 单文件 10MB 上限 + 总配额(`du -sh` 监控,P1 加 quota) |
| 恶意文件伪装 mime | 改后缀 | 后端用 `file-type` 库二次校验 magic number |
| 大图加载慢 | 单图 > 5MB | 缩略图(`sharp`)P2;本轮不下,只前端 `<img loading="lazy">` |
| 与现有 `Attachment` 表重复 | 历史数据 | 保留 `Attachment`(任务附件),`LibraryAsset`(全局资料库),业务边界不同 |

---

## 7. 推荐下一步(给 orchestrator)

> **核心建议:阶段 1.5 必须先做,不能跳。**

### 7.1 选项 A:先补阶段 1.5(强烈推荐)

```
阶段 1.5 (0.5-1 天) → 阶段 2 → 阶段 3 → 阶段 4 || 阶段 5
```

理由:
1. **生产是 0 状态**:不上线阶段 1,阶段 2-5 跑完用户也看不到,无业务价值
2. **代码层 ≠ 生产层**:上一轮已经证明本地 commit 不等于 ECS 生效;不写 `deploy-stage1.sh` 不重跑,后面 4 个阶段每个都重蹈覆辙
3. **0.5-1 天成本极低**:相比阶段 2-5 总共 8-12 天,1 天抢救不算贵
4. **建立部署信任链**:用 probe-stage1.sh 把"3 端点 401 + 1 表存在 + 1 行 5 = 5"作为阶段 1 验收金标准,后续 4 个阶段复用

### 7.2 选项 B:跳到阶段 2(不推荐)

- 业务价值 = 0(用户看不到)
- 风险:阶段 2-5 的部署仍会出问题,因为没根治"commit 不等于部署"的问题
- 唯一适用场景:并行开发期,先在本地 mock,等阶段 1.5 后再部署

### 7.3 选项 C:完全重做阶段 1(不推荐,过大)

- 阶段 1 的代码已经 commit,质量没问题
- 重做 = 推翻重来,无收益
- 唯一适用场景:阶段 1 验收发现设计错误,但目前没发现

### 7.4 推荐

**选项 A**;同步并行启动 阶段 2-5 的**代码开发**(在本地跑),部署统一在阶段 1.5 通过后批量上。

### 7.5 整体工期估算(乐观 / 现实)

| 阶段 | 工作量(人天) | 前置 |
|------|---------------|------|
| 1.5 部署抢救 | 0.5 / 1 | — |
| 2 年度看板 | 1 / 2 | 1.5 |
| 3 批量导入 | 2 / 3 | 1.5 |
| 4 消息中心 | 2 / 3 | 1.5(2/3 可并) |
| 5 资料库 | 2 / 3 | 1.5(2/3/4 可并) |
| **合计** | **7.5 / 12 人天** | — |

并行优化后(2 串行,3/4/5 并行):**5-8 工作日**(乐观 / 现实)

---

## 8. 风险登记(按阶段)

| 阶段 | 风险 | 等级 | 缓解 |
|------|------|------|------|
| 1.5 | `prisma migrate deploy` 报 drift | P0 | 跑前 `migrate status`;先 backup db |
| 1.5 | 旧 dist 6/9 与新 schema 不匹配,服务起不来 | P0 | 编译失败不覆盖 dist;`rollback-stage1.sh` 5 分钟回滚 |
| 1.5 | `add-wangtian-to-projects.cjs` 主键冲突 | P1 | `INSERT OR IGNORE` |
| 1.5 | AI 历史承诺"已部署"复发 | P0 | probe 脚本 + 部署报告强制三件套(端点 + 表 + SQL 行数) |
| 2 | 全年 > 1k 任务首屏慢 | P1 | 上限 10000 + 分页入口 |
| 3 | ExcelJS 与现有依赖冲突 | P1 | 提前 `pnpm why`;备选 `xlsx` |
| 3 | 大文件内存爆 | P1 | multer diskStorage + 流式 |
| 4 | 旧 `type` 字段语义不清 | P0 | 第一天字段审计;决定保留/重命名/共存 |
| 4 | 漏改 `createNotification` 调用 | P1 | 全文搜索 + checklist |
| 5 | 存储爆盘 | P1 | 单文件 10MB 上限,总配额 P1 |
| 5 | 恶意文件伪装 mime | P1 | `file-type` 二次校验 |
| 通用 | 部署通道断裂(commit ≠ ECS 生效) | **P0 全程** | 阶段 1.5 后,每次部署都跑 probe |
| 通用 | `.env` 被误改 | P0 | deploy 脚本 `--exclude .env` 强制 |
| 通用 | DB schema 漂移 | P0 | 每次只跑 `migrate deploy`,不跑 `migrate dev` |

---

## 9. 不在本轮范围(明确"何时回看")

| 项 | 原因 | 何时回看 |
|----|------|----------|
| 邮件通知(SMTP) | 需凭据 + 模板,本轮不做 | P2:有用户明确要求 + SMTP 凭据就绪时 |
| 移动端响应式 | 工作量大,本轮只保证不破 | P1:有用户明确移动端需求时 |
| 国际化(i18n) | 业务方单语,ROI 低 | P1:多语言客户接入 |
| 单点登录 / OAuth | 企业资质未到 | P2:HR 系统对接需求时 |
| Word / PDF 智能解析(阶段 3d) | 依赖外部 LLM API,稳定性差 | P2:阶段 3 上线后根据用户反馈 |
| Excel 导出 | 用户还没明确要 | P1:有用户提需求时(导出复用 ExcelJS) |
| 任务重复规则(已支持重复?) | 没在 r0 需求清单 | P2:在 r1 评估 |
| `Comment` 表彻底废弃 | 旧数据保留只读,UI 隐藏 | P2:6 个月后无引用,做归档迁移 |
| 任务指派多人(目前 1 人) | 业务规则限定 | 不做,违反业务规则 |
| 离线模式 / PWA | 工程量大 | P2:r1 评估 |

---

## 10. 计划变更记录

| 日期 | 版本 | 变更 | 原因 |
|------|------|------|------|
| 2026-06-24 | r0-plan v1 | 起草 5 阶段计划 | 反馈迭代 r0 启动 |
| 2026-06-25 | r0-recovery v1(本文) | (a) §1 收口:阶段 1 在生产 0/5 生效;(b) 新增 §2 阶段 1.5 部署抢救;(c) §7 推荐先做 1.5;(d) §8 风险登记加 P0"部署通道断裂" | T1 audit 揭露"commit ≠ 部署" |

---

> **结束**。本计划将在阶段 1.5 验收通过后,update §1.4 状态,并按 §7.4 推进。
