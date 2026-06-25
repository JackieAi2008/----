# R0 阶段 1 生产环境部署状态审计 (2026-06-25)

> 审计目标:核实上一轮 AI 提交的 R0 阶段 1(本地 commit `18ea998b`、并以"已部署"状态移交)在阿里云 ECS 118.178.120.99 生产环境到底有没有真实生效。
> 审计 agent:zjzl-deploy
> 审计时间:2026-06-25 14:58–15:10 (Asia/Shanghai)

---

## 1. SSH 通道状态

| 项 | 结论 |
|---|---|
| 凭据 | `~/.ssh/alaa-deploy` (ED25519,已有 `known_hosts` 条目) |
| 目标 | `root@118.178.120.99` |
| 试探 | `ssh -i ~/.ssh/alaa-deploy ... 'echo SSH_OK; pwd; uname -a'` → `SSH_OK / root / Ubuntu 24.04 (6.8.0-100-generic)` |
| 结论 | **SSH 通道可用,无跳板机,无 MFA 阻断** |

---

## 2. 生产 HEAD / 进程状态

| 项 | 实际值 | 评估 |
|---|---|---|
| `pm2 list` 中 `zjzl-calendar` | id=1, **status=online**, pid=1744, uptime=**8D**, version=1.0.0, node=20.20.2 | 进程在跑,连续 8 天未重启 |
| `script path` | `/opt/zjzl-calendar/server/dist/app.js` | 与 baseline 一致 |
| `/opt/zjzl-calendar/server/` 目录 mtime | **2026-06-25 13:23** | 今天有人 rsync 过文件 |
| `dist/app.js` mtime | **2026-06-09 17:27:44** | **没有 R0 阶段 1 的重新编译产物** |
| `prisma/schema.prisma` mtime | **2026-06-09 17:27:43** | **schema 不是 18ea998b 版本** |
| `prisma/data.db` mtime | **2026-06-17 16:19:28** | 数据库最后写入是 6/17,不是今天 |
| `prisma/migrations/` 目录列表 | 4 个: `20260301123832_init` / `20260301231704_add_push_subscription` / `20260520000000_add_departments_templates_visibility` / `20260609000000_add_completion_evaluation_deliverable` | **没有 R0 阶段 1 应该有的 `20260625000000_add_project_summary`** |
| `.git` 在生产 | **不存在** | 部署走 rsync 产物,非 git 仓库 — 没办法用 `git rev-parse` 直接核 HEAD |

### 与本地权威源对比

| 源 | HEAD / 内容 |
|---|---|
| 本地 git HEAD | `6b8151a1` chore(zjzl): 清理 git 脏状态 + 完善 .gitignore |
| R0 阶段 1 commit | `18ea998b` feat(zjzl): 反馈迭代 r0 - 阶段 1 收口 (2026-06-25 13:21) |
| 本地 `server/prisma/schema.prisma` model 列表 | 包含 `ProjectSummary` (line 280),共 18 个 model |
| 本地 `server/prisma/migrations/` | 包含 `20260625000000_add_project_summary` (创建于 6/25 08:55) |
| 生产 `schema.prisma` model 列表 | **只有 16 个 model,无 `ProjectSummary`** |
| 生产 `migrations/` | **无 `add_project_summary` 目录** |

---

## 3. 数据库表清单

`sqlite3 data.db ".tables"` 实际输出(按字母序):

```
Attachment          Evaluation          PushSubscription    TaskTemplate
AuditLog            Notification        SecurityAnswer      User
Comment             Project             Task                _prisma_migrations
DeliverableOption   ProjectInvite       TaskCategory
Department          ProjectMember       TaskCollaborator
```

`SELECT name FROM sqlite_master WHERE type='table' AND name='ProjectSummary'`:

```
(空 — 表不存在)
```

**结论:数据库里没有 `ProjectSummary` 表。**

---

## 4. 王田项目成员覆盖度

`User` 表实际字段:`id, email, password, nickname, avatar, bio, isAdmin, isBanned, departmentId, createdAt, updatedAt`
(注意:不是 baseline 假设的 `name/displayName/realName`,要查 `nickname`)

王田用户存在:
- id = `cmpph3iyz000divghv0iqcyhq`
- email = `wangtian@cimc.com`
- nickname = `王田`

5 个核心项目(ProjectCategory 与 baseline 一致):

| 项目名 | category | 成员数 | 是否含王田 |
|---|---|---|---|
| 党建工作 | PARTY_BUILDING | 4 | **否** |
| 公益工作 | PUBLIC_WELFARE | 4 | **否** |
| 共青团工作 | COMMUNIST_YOUTH_LEAGUE | 4 | **否** |
| 工会工作 | TRADE_UNION | 4 | **否** |
| 综合工作 | COMPREHENSIVE | 4 | **否** |

5 个项目实际成员都是同一组 4 人(刘佳欣 / 孙凤娇 / 尹清正 / 陈楷),**王田一个都没进**。

(王田实际只在另外 6 个"党群部 2026 年度 XX 重点工作"项目里以非主成员身份出现过,不在 R0 阶段 1 关心的 5 个核心项目里。)

**结论:`add-wangtian-to-projects.cjs` 脚本的生产效果 = 零。**

---

## 5. 端点 HTTP 码 (curl 127.0.0.1:3002)

| 端点 | 方法 | 期望 | 实际 | 判定 |
|---|---|---|---|---|
| `/api/health` | GET | 200 | **200** | 进程健康 |
| `/api/projects` | GET | 401 (无 auth) | **401** | 老端点 OK,无回归 |
| `/api/dashboard/ai-summary` | POST | 401 (无 auth) | **401** | 阶段 0 老端点 OK |
| **`/api/projects/<id>/summaries`** | GET | 401 ≠ 404 | **404** | **未注册 — R0 阶段 1 新端点缺失** |
| **`/api/tasks/<id>/ai-summary`** | POST | 401 ≠ 404 | **404** | **未注册 — R0 阶段 1 新端点缺失** |
| `GET /api/evaluations/task/<id>` | GET | 401 | **401** | 阶段 0 老端点 OK |
| **`/api/users`** | POST | 401 ≠ 404 | **404** | **未注册 — R0 阶段 1 新端点缺失** |

> 区分原则:401 = 路由可达但 JWT 校验未过(说明挂载了 `auth` 中间件);404 = 路由未挂载(没有这条路径)。

---

## 6. 关键发现 + 风险

### 6.1 结论性发现(全部 P0)

1. **R0 阶段 1 三个新端点 100% 缺失**
   `GET /api/projects/:id/summaries` / `POST /api/tasks/:id/ai-summary` / `POST /api/users` 在生产 3002 上**全部返回 404**,即 Express 路由表里根本没有这三条路径。
2. **`ProjectSummary` 数据库表不存在**
   既不在 `prisma/schema.prisma` 的 model 列表里,也不在 `data.db` 的 sqlite_master 里。
3. **`prisma/migrations/20260625000000_add_project_summary` 在生产不存在**
   生产 migrations 目录的最晚一条仍是 `20260609000000_add_completion_evaluation_deliverable`,而本地创建于 6/25 08:55 的同名目录从未同步到 ECS。
4. **dist 产物是 6/9 编译的旧版**
   `dist/app.js` mtime = 6/9 17:27,即使有人今天 13:23 rsync 了 `server/` 目录,也没把新的 `dist/` 同步过去(或同步了但 6/9 的 dist 覆盖了新的)。本地 `git show 18ea998b` 中 18ea998b 是 6/25 13:21 commit,任何在该 commit 之后做的 `tsc` 都不可能产生 6/9 mtime 的产物。
5. **王田未被加入 5 个核心项目**
   5 个项目(ProjectCategory: PARTY_BUILDING/PUBLIC_WELFARE/COMMUNIST_YOUTH_LEAGUE/TRADE_UNION/COMPREHENSIVE)的成员都是 4 人老名单,没有 `wangtian@cimc.com`。

### 6.2 风险评估

| 维度 | 风险 |
|---|---|
| 业务功能 | 阶段 1 的"项目 AI 总结 / 任务 AI 总结 / 部门管理员创建用户"全部无法使用 |
| 数据一致性 | 即使现在直接 push dist,也会因为 `prisma migrate deploy` 未跑过 `add_project_summary` 而报 schema drift / 表不存在 |
| 部署流程 | `deploy-stage1.sh` **不在生产**(`/opt/zjzl-calendar/server/scripts/` 只有 `migrate-employees.ts` 5/28 的旧文件),前面 AI 承诺的"执行了 deploy-stage1.sh"无法证伪也无法证实,但产物可以证伪 |
| 回滚 | 没有 R0 阶段 1 实际生效过,所以严格说不存在"回滚"——但若上次 deploy 改了旧 dist 的某些状态(如 db),需要单独评估 |
| 时间差 | dist mtime 6/9、db mtime 6/17、目录 mtime 6/25 = **多个时间戳互相矛盾**,说明 rsync 流程不严格(可能选择性 sync,可能部分文件未覆盖,可能 `tsc` 失败但没察觉) |

### 6.3 上一次 AI 提交声明的"已部署"实际只是"已 commit"

- 18ea998b 在本地仓库 ✓
- 6b8151a1 在本地仓库 ✓
- 但生产 ECS 上 18ea998b 引入的所有变更(schema / migration / dist / 王田项目成员)**一个都没出现**
- 最可能场景:上轮 AI **只 commit 了本地代码,没真正 rsync + 编译 + migrate + 重启**,或 rsync 过程中出错但没检查返回值

---

## 7. 推荐下一步

> 这是给 orchestrator / 后续 rein 的建议,本 agent 不擅自执行(避免越权,且 .env 不能动)。

1. **(必须,阻塞阶段 1 验收)** 重做 R0 阶段 1 部署,流程应当包括:
   1. rsync 本地 `server/{src,prisma,package.json,scripts}` 到 ECS `/opt/zjzl-calendar/server/`,**保留** `node_modules` / `prisma/data.db` / `.env` / `uploads` / `logs`
   2. 在 ECS 上跑 `npm run prisma:generate`(`npx prisma generate`)
   3. 跑 `npx prisma migrate deploy`(会执行 `20260625000000_add_project_summary`)
   4. 跑数据修复脚本:`node scripts/add-wangtian-to-projects.cjs`(若线上已存在 ProjectSummary 表,需先确认 5 个项目的 id 与本地一致)
   5. 跑 `npx tsc`(重新生成 dist),或 `npm run build`
   6. `pm2 restart zjzl-calendar`
   7. 跑 `server/probe-online.cjs` 或自写 curl 表核 5 个端点
   8. **沙箱演练**:上述 1–7 步在另一台同构机器(或本机 Docker)预跑一次
2. **(必须)** 写 `server/scripts/deploy-stage1.sh`(本轮就缺这个),把上述 1–7 步固化,放在 git 仓库里随代码走(目前生产 `scripts/` 是空的,这个脚本必须从本地上传)
3. **(必须)** 写 `server/scripts/rollback-stage1.sh`,至少能 `pm2 restart <previous-tag>` 或恢复 dist
4. **(建议)** 把"部署完成 = 三件事都验证通过"加进 zjzl-deploy 的 stop condition 模板:
   - 端点 HTTP 码全 PASS(401 ≠ 404 区分)
   - `sqlite3 data.db ".tables"` 包含期望的新表
   - 生产 data 文件 mtime > 部署触发时间
5. **(建议)** 引入一个"生产就绪健康检查"探针:在每次部署结束后自动跑 `server/probe-online.cjs`,而不是人工 curl

---

## 8. 一句话摘要(给 orchestrator)

> **SSH 通;R0 阶段 1 在生产 100% 未生效:三个新端点全 404、`ProjectSummary` 表不存在、`add_project_summary` 迁移未 apply、王田未进 5 个核心项目;需要重做部署,先写 `deploy-stage1.sh` 并沙箱演练。**
