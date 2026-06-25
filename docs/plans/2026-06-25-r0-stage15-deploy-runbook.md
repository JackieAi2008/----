# R0 阶段 1.5 部署 runbook (zjzl-deploy 真机 §2.3 用)

> 起: 2026-06-25 16:12 (沙箱 docker pull 卡死,降级真机演练 + 部署)
> 落 git: 待 commit (本文件由 zjzl-dev 起草,供 zjzl-deploy 直接 cat 走流程)
> 关联计划: docs/plans/2026-06-25-r0-recovery-plan.md §2.3

## 0. 前置条件 (jumpbox / 跳板机要求)

- Linux 或 macOS (Windows 不行,scp/rsync/git archive 都依赖 unix tools)
- 已装: `git` / `ssh` / `rsync` / `tar`
- 已配 SSH key: `~/.ssh/alaa-deploy` 或同等免密到 root@118.178.120.99
- 能访问 origin repo (内网 git 或公网 https)

## 1. 关键 commit 锚点

| commit | 内容 | 何时用 |
|--------|------|--------|
| `9af4bb5d` | deploy / rollback / probe-stage1.sh 三件套 | 主部署脚本 |
| `d55e0d68` | + sandbox-bootstrap.sh (国内 docker 镜像兜底) | 沙箱若 docker pull 不通可用 |

两个 commit 都在 `master` 分支,origin 已推送/未推送看 push 状态。

## 2. 同步源码到产线 (三种路径,任选一)

### 2.A 推荐: 干净 clone + rsync

```bash
# jumpbox
mkdir -p /tmp/zjzl-stage1 && cd /tmp/zjzl-stage1
git clone <REPO_URL> repo
cd repo
git checkout d55e0d68   # 或 master HEAD

# 把 server/ 同步到产线,exclude 掉产线该有的东西
rsync -av --delete \
  --exclude=node_modules \
  --exclude=dist \
  --exclude=.env \
  --exclude='*.db' \
  --exclude='*.db-journal' \
  --exclude=logs \
  --exclude=coverage \
  --exclude='.bak' \
  -e 'ssh -o StrictHostKeyChecking=accept-new' \
  server/ root@118.178.120.99:/opt/zjzl-calendar/server/
```

**关键 exclude**:
- `node_modules` 远端已装,不能覆盖 (跨 CPU 架构可能不兼容,本项目同 x86_64 但仍不覆盖)
- `dist` 远端有旧版,会在产线 `tsc` 重建
- `.env` 产线敏感,绝不同步
- `*.db` SQLite 数据库,产线有真实数据
- `.bak` 备份目录,有的话别清空

### 2.B 轻量: git archive over ssh (免 clone 整仓)

```bash
# jumpbox
git archive --remote=<REPO_URL> d55e0d68 server/ \
  | ssh -o StrictHostKeyChecking=accept-new root@118.178.120.99 \
    'rm -rf /opt/zjzl-calendar/server/scripts /opt/zjzl-calendar/server/src /opt/zjzl-calendar/server/prisma /opt/zjzl-calendar/server/package.json && tar -x -C /opt/zjzl-calendar/server'
```

只更新 src/ scripts/ prisma/ package.json,其他不动。

### 2.C 最轻: 单文件 scp

```bash
# jumpbox
cd repo  # 已 clone 好
scp server/scripts/deploy-stage1.sh \
    server/scripts/rollback-stage1.sh \
    server/scripts/probe-stage1.sh \
    server/scripts/sandbox-bootstrap.sh \
    root@118.178.120.99:/opt/zjzl-calendar/server/scripts/
```

仅当只改脚本不动 src/ prisma/ schema 时用。本次阶段 1.5 涉及迁移和 schema,推荐 2.A 或 2.B。

## 3. 远端环境检查 (SSH 进去后)

```bash
ssh root@118.178.120.99

# 基础工具
node -v                    # 期望 v20.20.x
npm -v                     # 期望 10.x
sqlite3 --version          # 期望 3.45+
pm2 --version              # 期望 5.x
which curl git rsync       # 都该有

# 当前进程
pm2 list | grep zjzl-calendar   # 看 uptime / status

# 产线关键文件 mtime (参考 audit 2026-06-25 14:58 的基线)
stat -c '%y %n' /opt/zjzl-calendar/server/dist/app.js
stat -c '%y %n' /opt/zjzl-calendar/server/prisma/schema.prisma
stat -c '%y %n' /opt/zjzl-calendar/server/prisma/data.db
stat -c '%y %n' /opt/zjzl-calendar/server/prisma/migrations/

# 预期 mtime:
#   dist/app.js     6/9 17:27:44  (旧版)
#   schema.prisma   6/9 17:27:43  (旧版,无 ProjectSummary)
#   data.db         6/17 16:19    (近期有写)
#   migrations/     4 个,最晚 6/9
```

## 4. 干跑 (重要!)

```bash
ssh root@118.178.120.99
cd /opt/zjzl-calendar/server
bash scripts/deploy-stage1.sh --dry-run
```

**预期输出** (远端):

```
================================================================
  中集智历 R0 阶段 1.5 部署脚本
  mode    = REMOTE
  target  = root@118.178.120.99:/opt/zjzl-calendar/server
  dry_run = 1
  ...
  本次将执行:rsync generate migrate data_fix build pm2 probe
================================================================
==[rsync]== ...
  [dry-run] rsync -av --delete ...
==[generate]== ...
  [dry-run] npx prisma generate
==[migrate]== ...
  [dry-run] mkdir -p /opt/zjzl-calendar/server/.bak/stage1-20260625-...
  [dry-run] cp -a ... /dist dist.bak
  [dry-run] sqlite3 .../data.db .backup '.../data.db.bak'
  [dry-run] npx prisma migrate resolve --applied 20260609000000_add_completion_evaluation_deliverable || true
  [dry-run] npx prisma migrate deploy
==[data_fix]== ...
  [dry-run] node scripts/add-wangtian-to-projects.cjs
==[build]== ...
  [dry-run] npx tsc
==[pm2]== ...
  [dry-run] pm2 restart zjzl-calendar
==[probe]== ...
  [dry-run] bash scripts/probe-stage1.sh
==[done]== ...
```

如果 dry-run 输出符合预期,继续真跑。

## 5. 真跑 (5 步)

```bash
ssh root@118.178.120.99
cd /opt/zjzl-calendar/server

# 5.1 migrate 单独跑 (失败隔离)
bash scripts/deploy-stage1.sh --step migrate

# 5.2 确认 db 表已加 ProjectSummary
sqlite3 prisma/data.db "SELECT name FROM sqlite_master WHERE type='table' AND name='ProjectSummary';"
# 期望: ProjectSummary

# 5.3 确认 prisma migrations 列表
ls -1 prisma/migrations/
# 期望出现 20260625000000_add_project_summary/

# 5.4 data_fix (王田)
bash scripts/deploy-stage1.sh --step data_fix

# 5.5 build + pm2 + probe
bash scripts/deploy-stage1.sh --step build
bash scripts/deploy-stage1.sh --step pm2
bash scripts/deploy-stage1.sh --step probe
```

或者一条龙: `bash scripts/deploy-stage1.sh` (skip 都没设就跑全部)。

## 6. 9 项断言必须全 PASS

`probe-stage1.sh` 跑完输出:

```
================================================================
  中集智历 R0 阶段 1 部署验证报告
  base_url = http://127.0.0.1:3002
  db_path  = /opt/zjzl-calendar/server/prisma/data.db
================================================================
  [A1] PASS  expect=200 actual=200  GET /api/health
  [A2] PASS  expect=401 actual=401  GET /api/projects
  [A3] PASS  expect=401 actual=401  POST /api/dashboard/ai-summary
  [A4] PASS  expect=401 actual=401  GET /api/evaluations/task/...
  [A5] PASS  expect=401 actual=401  GET /api/projects/.../summaries
  [A6] PASS  expect=401 actual=401  POST /api/tasks/.../ai-summary
  [A7] PASS  expect=401 actual=401  POST /api/users/create
  [A8] PASS  expect=present actual=present  sqlite_master has ProjectSummary
  [A9] PASS  expect=5 actual=5  SELECT COUNT(*) FROM ProjectMember ...
  总计: PASS=9  FAIL=0
  ✓ 阶段 1 在生产已生效
```

如果 FAIL:
- A1 FAIL = 进程没起来 / 端口错,先看 `pm2 logs zjzl-calendar --lines 50`
- A2-A4 FAIL = 老端点回归,看 dist mtime,如果还是 6/9 说明 rsync 没生效
- A5-A7 FAIL = dist 还是 6/9 旧版,重跑 build + pm2 restart
- A8 FAIL = migration 没跑通,重跑 step=migrate,看 prisma 错误
- A9 FAIL = add-wangtian 跑过但没生效,看 .bak/data.db.bak 是否回退过;或 db 里有 wangtian 但 ProjectMember 没插

## 7. 备份回滚 (任何阶段想撤)

```bash
ssh root@118.178.120.99
cd /opt/zjzl-calendar/server

# 看有哪些备份
ls -la .bak/

# 默认回滚到最近一次 deploy 前的备份
bash scripts/rollback-stage1.sh

# 回滚到指定 git tag/commit (会从本地 clone 的 git 取 dist)
bash scripts/rollback-stage1.sh --to 6b8151a1

# 只备份不还原
bash scripts/rollback-stage1.sh --backup-only
```

## 8. 报告模板 (贴给 orchestrator)

部署完成后,把以下内容贴到 `docs/plans/2026-06-25-stage15-deploy-report.md`:

```
=== 部署时间戳 ===
date -Iseconds

=== 部署前 dist mtime ===
stat -c '%y' /opt/zjzl-calendar/server/dist/app.js

=== 部署后 dist mtime ===
stat -c '%y' /opt/zjzl-calendar/server/dist/app.js

=== probe-stage1.sh 输出 ===
bash scripts/probe-stage1.sh

=== pm2 status ===
pm2 list | grep zjzl-calendar
pm2 logs zjzl-calendar --lines 50 --nostream

=== db 关键表 ===
sqlite3 prisma/data.db ".tables"
sqlite3 prisma/data.db "SELECT name FROM sqlite_master WHERE type='table' AND name='ProjectSummary';"
sqlite3 prisma/data.db "SELECT COUNT(*) FROM ProjectMember WHERE userId = (SELECT id FROM User WHERE email='wangtian@cimc.com');"

=== 备份路径 ===
ls -d /opt/zjzl-calendar/server/.bak/stage1-* | tail -5
```

## 9. 风险与回退点

| 风险 | 触发 | 回退 |
|------|------|------|
| migrate drift | prisma 报 "drift detected" | 跑前先 `npx prisma migrate status`;若有 drift 用 `prisma migrate resolve` |
| 旧 dist 6/9 与新 schema 不匹配 | tsc 报错 | rollback-stage1.sh 5 分钟回滚 |
| AI 总结按钮 500 | DeepSeek 配额 | aiSummaryService 已有降级逻辑;UI 显示"暂不可用,请手动填写" |
| 端口冲突 3002 | 其他进程占用 | `lsof -i:3002` / `pm2 delete zjzl-calendar && pm2 start dist/app.js --name zjzl-calendar` |
| sshd root login 关闭 | audit 失败 | 用 sudo 替代;或临时 PermitRootLogin yes |

## 10. 关联

- 计划: docs/plans/2026-06-25-r0-recovery-plan.md §2.3
- 部署脚本 commit: 9af4bb5d (三件套), d55e0d68 (+bootstrap)
- 阶段 1 设计: docs/plans/2026-06-24-zjzl-feedback-r0-plan.md §2
- 生产基线: docs/plans/2026-06-24-zjzl-feedback-r0-baseline.md
- 审计: docs/plans/2026-06-25-r0-prod-audit.md
