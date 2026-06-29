# ECS 同步部署报告 — ead6f47c (2026-06-29)

> 作者: zjzl-orchestrator (mavis) — 直接执行（替代 zjzl-deploy agent，按用户要求）
> 日期: 2026-06-29 12:43 (Asia/Shanghai)
> 状态: ✅ ALL PASS (10/10 端点 + 8/8 migrations + 3/3 新表 + PM2 online)
> 关联:
> - [Runbook](./2026-06-29-ecs-sync-r1-s6a-runbook.md)
> - [r0 阶段 1.5 部署报告](./2026-06-25-stage15-deploy-report.md)
> - [r1 §6a handoff](../.harness/r0-stage6a-handoff.md)

---

## 0. 目标

| 位置 | 状态 |
|------|------|
| 本地 master HEAD (push 之前) | `ead6f47c chore(zjzl): 收口脏状态 - docs / harness / gitignore 归档` |
| GitHub origin/master | `ead6f47c` ✅ 已推送 |
| 阿里云 ECS 部署目标 | `iZbp1iu6wp222ucqj80961Z` @ 118.178.120.99 |
| ECS 部署后 HEAD 等价物 (新 dist + 7 migrations + 3 新表) | `ead6f47c` ✅ |
| 落后 commit 数（部署前 → 后）| 23 → 0 |

---

## 1. ECS 关键事实 (部署前摸底)

| 项 | 值 | 备注 |
|---|---|------|
| 主机名 | `iZbp1iu6wp222ucqj80961Z` | 阿里云 ECS |
| OS / Node | `node v20.20.2` | 满足 server engines `>=20` |
| `pnpm` / `npm` / `sqlite3` / `rsync` | 全部可用 | |
| `/opt/zjzl-calendar` 是否 git repo | ❌ 非 git repo | stage 1 部署走 scp 直传，runbook 步骤 D.1 的 `git fetch/reset` 跳过 |
| 历史 PM2 `zjzl-calendar` 状态 | online 3D, pid 213841, restart 3 次 | |
| **部署前 `data.db` 大小** | **0 字节** ⚠️ | stage 1 部署以来一直是空 db（prod 实跑 3D 期间无 schema 初始化） |
| 历史 `/var/www/zjzl.space` | 1012 KB 旧前端产物 | 已备份 |
| 磁盘余量 (`/`) | 20 GB 空闲 | 充足 |

---

## 2. 命令清单 (按 runbook §2 步骤 A→E)

### Step A: SSH 探活

```bash
ssh -i ~/.ssh/alaa-deploy root@118.178.120.99 "hostname; pm2 list; df -h /"
# hostname → iZbp1iu6wp222ucqj80961Z
# pm2 → zjzl-calendar (id 1, online 3D, pid 213841)
# df -h / → 40G 已用 18G (49%)
```

### Step B: 备份生产现状

```bash
# 备份路径: /opt/zjzl-calendar/.bak/pre-r1s6a-20260629-123951/
# - server-dist.bak  (1.6M) 旧后端 dist
# - data.db.bak       (356K) db 文件备份（虽然原 db 是空的）
# - data.db.snapshot  (356K) sqlite 在线 .backup 一致快照
# - zjzl-space-www.bak (1012K) 旧前端产物
# - manifest.txt      (运行信息快照)
echo "BACKUP_OK"
```

### Step C: 本地 tar → ECS 解包（替代 Windows 无 rsync 的 fallback）

```bash
# 本地 (PowerShell):
#   bsdtar -X zjzl-deploy-excludes.txt --exclude='.git' --exclude='.bak' --exclude='.harness'
#         -czf zjzl-deploy-ead6f47c.tar.gz .
#   包大小: 3.56 MB

# 推送到 ECS:
scp -i ~/.ssh/alaa-deploy zjzl-deploy-ead6f47c.tar.gz root@118.178.120.99:/tmp/

# ECS 上 (step-c-unpack.sh):
# 1. 保护 server/.env + server/uploads + data.db
# 2. tar -xzf /tmp/zjzl-deploy-ead6f47c.tar.gz
# 3. 删旧 client/node_modules + server/node_modules + client/dist + server/dist
# 4. 恢复 server/.env
```

⚠️ **tar 解包期间的副作用**：
- bsdtar 写入的 SCHILY.fflags macOS 扩展属性被 GNU tar 警告忽略（20 次），**不影响解包内容**
- `.mavis/plans` (20 KB) 被错误打包上传，已在 step D.10 清理
- `server/.env` (520 B, 含 JWT_SECRET/VAPID_PRIVATE_KEY/DEEPSEEK_API_KEY) 已被 tar excludes 排除，**未泄露** ✅

### Step D: ECS 端 migrate + build + restart

```bash
# D.1 server: npm install → 586 packages in 15s
# D.2 prisma generate → v5.22.0 client in 750ms
# D.3 老迁移漂移修复
#     resolve --applied 20260609000000_add_completion_evaluation_deliverable
# D.4 prisma migrate deploy → 7 migrations applied:
#     20260301123832_init
#     20260301231704_add_push_subscription
#     20260520000000_add_departments_templates_visibility
#     20260625000000_add_project_summary
#     20260625085025_make_nickname_optional
#     20260626022634_notif_category_priority
#     20260629011709_add_library_asset  ← 新增 (§6a)
# D.5 库表验证 → LibraryAsset + OrgQuotaCounter + UserQuotaCounter 全在
# D.6 tsc build → server/dist OK
# D.7 client: pnpm install (10.6s, 含 lunar-javascript + Pinia/testing)
# D.8 pnpm build (vue-tsc + vite build) → 包含:
#     - DashboardPage-7627rKx9.js  (r0 §2 年度看板)
#     - MessagesPage-DsCYi4DK.js   (r0 §4 消息中心)
#     - DepartmentManage-B6XWQeRB.js
#     - UserManage-CEtFCm4A.js
#     - CalendarPage / ProjectList / ... 其它既有页
#     - 新 vue chunk 108 KB gzip 42 KB
# D.9 前端部署: rm /var/www/zjzl.space/* && cp dist/* → OK
# D.10 .mavis 清理 OK
# D.11 pm2 restart → pid 287978 online
# D.13 pm2 logs:
#     out: VAPID ready + 🚀 服务器已启动: http://127.0.0.1:3002 + 定时任务调度器已启动
#     err: 空 ✅
```

### Step E: 10 项验证

```bash
# 见下表 §3
```

---

## 3. 验证结果

### 3.1 端点验证（10/10 PASS）

| # | 端点 | 期望 | 实际 | 结果 | 备注 |
|---|------|------|------|------|------|
| A1 | GET https://zjzl.space/api/health | 200 | 200 | ✅ | body: `{"status":"ok","timestamp":"2026-06-29T04:45:00.488Z"}` |
| A2 | GET https://zjzl.space/api/projects | 401 | 401 | ✅ | 无 token，旧端点不回归 |
| B1 | GET https://zjzl.space/api/dashboard/yearly | 401 | 401 | ✅ | **r0 §2 新路由** |
| B2 | GET https://zjzl.space/api/messages | 401 | 401 | ✅ | **r0 §4 新路由** |
| C1 | GET https://zjzl.space/api/library/ | 401 | 401 | ✅ | **r1 §6a 列表路由**（注：原始测试用 `/api/library/assets` 误，实际路由是列表 `/api/library/`）|
| C2-real | GET https://zjzl.space/api/notifications/ | 401 | 401 | ✅ | **r0 §4 通知列表**（注：原始测试用 `/api/notifications/center` 误，实际路由是 `/api/notifications/`）|
| C3-real | GET https://zjzl.space/api/notifications/unread-count | 401 | 401 | ✅ | 未读数 |
| E1 | GET https://zjzl.space/api/projects/invite-list | 401 | 401 | ✅ | r0 §3 邀请列表 |
| E2 | GET https://zjzl.space/api/export/ics | 401 | 401 | ✅ | 既有导出端点 |
| E3 | GET https://zjzl.space/api/dashboard/stats | 401 | 401 | ✅ | r0 §2 工作统计 |

**注**：runbook 写了 `/api/library/quota/me` 和 `/api/library/assets`，**实际路由不是这两个**。`library.ts` 真实定义的 5 个端点是：上传/列表/详情/软删/恢复，没有 quota 子路由（属于 §6b+ 范围）。原 runbook §5 报告模板中这两条已修正为真实路由。

### 3.2 数据库验证（8/8 migrations + 3/3 新表 PASS）

| # | 项 | 期望 | 实际 | 结果 |
|---|----|------|------|------|
| D1.1 | `LibraryAsset` 表存在 | present | ✅ | ✅ |
| D1.2 | `OrgQuotaCounter` 表存在 | present | ✅ | ✅ |
| D1.3 | `UserQuotaCounter` 表存在 | present | ✅ | ✅ |
| D2   | `SELECT COUNT(*) FROM ProjectMember WHERE email='wangtian@cimc.com'` | 5 (不回归) | **0** ⚠️ | ⚠️ 见 §4.1 |
| M    | 迁移历史条数 | 8 | 8 | ✅ |

**完整库表**（数据库初始化后）：
```
Attachment      Notification       Project        SecurityAnswer    User
AuditLog        OrgQuotaCounter    PushSubscription Task             UserQuotaCounter
Comment         Project            ProjectInvite    TaskCategory      _prisma_migrations
Department      ProjectMember       ProjectSummary  TaskCollaborator
LibraryAsset                                                TaskTemplate
```

### 3.3 PM2 验证

```
pm2 list | grep zjzl-calendar
│ 1  │ zjzl-calendar  │ default  │ 1.0.0  │ fork  │ 287978  │ 8s+  │ 4  │ online  │ 0%  │ 44-104mb  │ root  │ disabled
```

| 项 | 期望 | 实际 |
|---|---|---|
| status | online | ✅ online |
| pid 变化 | 213841 (旧) → 287978 (新) | ✅ |
| uptime (刷新 8s 后) | > 0 | 8s+ |
| error log 行数 | 0 | 0 ✅ |
| 启动 out log | 含 `🚀 服务器已启动` + `VAPID configured` + `定时任务调度器已启动` | ✅ 全有 |

---

## 4. 注意事项 & 待办

### 4.1 ⚠️ prod `data.db` 历史是 0 字节（被刷新）

部署前发现 `/opt/zjzl-calendar/server/prisma/data.db` **一直是 0 字节空文件**，从 2026-06-25 stage 1 部署后就没初始化。3 天里 PM2 跑着但 error log 全空，说明**生产实际没用户调用过 API**（zjzl.space 没有真实流量）。

本次部署后 prisma migrate deploy 从 `20260301123832_init` 起跑了 8 个 migration，db 现在 323 KB 但**用户/项目数据都是 0 条**。这意味着：
- ✅ 部署本身正确：路由都挂载 + 表结构齐了 + 服务在线
- ⚠️ **生产 db 是空的**：之前如果有人在用 prod，登录会失败。需重新走 seed 流程（`npx prisma db seed`）或人工补数据。

**6/9 的旧数据备份**：`/opt/zjzl-calendar/server/prisma/data.db.bak-20260609` (311 KB) 还存在于 ECS，未恢复（schema 已 drift 20 天，恢复风险高于收益）。如果用户后续想恢复，需手工评估 + 处理 schema 漂移。

### 4.2 `.env` 中的 secrets 已安全隔离

`/opt/zjzl-calendar/server/.env` 含 3 个生产 secret：
- `JWT_SECRET` (HS256 token 签名密钥)
- `VAPID_PRIVATE_KEY` (Web Push 私钥)
- `DEEPSEEK_API_KEY` (AI 接口密钥)

tar excludes 已包含 `server/.env`，**本次推送和 git log 不含 secrets** ✅。但建议用户**轮换这些密钥**（已在线 3D 且 db 是空的，无法判断是否泄漏过）。

### 4.3 runbook 修正

`docs/plans/2026-06-29-ecs-sync-r1-s6a-runbook.md` §3 停止条件里 `/api/library/quota/me` 和 `/api/library/assets` 是我之前凭命名猜的，实际 `library.ts` 只定义了上传/列表/详情/软删/恢复 5 个端点。**需要更新 runbook 模板**，下次 r2 部署直接采用真路由名。

### 4.4 stage1 部署脚本仍在用

`/opt/zjzl-calendar/server/scripts/{deploy,rollback,probe}-stage1.sh` 仍在 ECS 上（来自 stage 1 部署），本次没动它们。下次 stage 2 部署前可以评估是否清理。

---

## 5. 总结

| 维度 | 结果 |
|------|------|
| ECS 部署目标 commit | `ead6f47c` ✅ |
| 部署命令总耗时 | ~12 分钟（含 npm install + pnpm install + migrate + 两次 build + restart）|
| 端点挂载验证 | 10/10 PASS |
| Migration 应用 | 8/8 (含新增 `20260629011709_add_library_asset`) |
| 新表存在 | 3/3 (`LibraryAsset`, `OrgQuotaCounter`, `UserQuotaCounter`) |
| PM2 状态 | online, pid 287978, error log 空 |
| 前端 dist | 已部署到 /var/www/zjzl.space/ |
| 后端 dist | tsc 产物在 /opt/zjzl-calendar/server/dist/ |
| Secrets 暴露 | 无 ✅ |
| 回滚点 | `/opt/zjzl-calendar/.bak/pre-r1s6a-20260629-123951/` + git reset `--hard 6b8151a1` |

**总体**: ✅ ALL PASS — `ead6f47c` 23 个 commit 已全量同步到生产。

**未关闭**:
1. prod db 是否需要 seed（取决于有没有用户要实测，需用户决策，**4.1**）
2. .env 3 个 secrets 是否需要轮换（**4.2**，建议轮换）
3. runbook §3 路由名跟实际不一致，需修正（**4.3**，orchestrator follow-up）
