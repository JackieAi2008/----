# ECS 同步 Runbook — 把生产推到 ead6f47c (r0 §2/3/4/5 + r1 §6a)

> 作者: zjzl-orchestrator (mavis)
> 日期: 2026-06-29
> 状态: 📋 待执行
> 关联: [r0 阶段 1.5 部署报告](./2026-06-25-stage15-deploy-report.md) · [stage5 设计](./2026-06-25-zjzl-r0-stage5-library-design.md) · [r1 §6a handoff](../.harness/r0-stage6a-handoff.md)

---

## 0. 当前状态

| 位置 | 状态 |
|------|------|
| 本地 master HEAD | `ead6f47c chore(zjzl): 收口脏状态 - docs / harness / gitignore 归档` |
| GitHub origin/master | `ead6f47c` ✅ 已推送 (本地 ahead 0) |
| 阿里云 ECS (118.178.120.99) | `6b8151a1` (6/25 16:13 部署的 r0 stage 1) — **落后 23 个 commit** |
| 待同步 commit 范围 | `6b8151a1..ead6f47c` 共 23 个 (r0 §1.5 抢救 + §2/3/4/5 + r1 §6a + 收口) |

## 1. 部署涉及的关键变更

| 类型 | 内容 |
|------|------|
| 新依赖 (runtime) | `lunar-javascript ^1.7.7` |
| 新依赖 (dev) | `@pinia/testing ^0.1.3`、`@playwright/test ^1.61.1` |
| 新 prisma 表 | `LibraryAsset`、`UserQuotaCounter`、`OrgQuotaCounter` (r1 §6a) |
| 新 prisma 迁移 | `20260625000000_add_project_summary` 之后的所有 |
| 新 API 路由 | r0 §2 `GET /api/dashboard/yearly` / r0 §3 批量导入 / r0 §4 消息中心 / r1 §6a `/api/library/*` |
| 新前端页 | DashboardPage 年度看板 + 月度柱图 / 批量导入 UI / 消息中心 UI / 资料库导航项 |
| Nginx | `/var/www/zjzl.space/` 重新构建产物 |

## 2. 部署步骤 (SSH 远程顺序执行)

> **执行前提**: 你有 `root@118.178.120.99` 的 SSH 凭据 (key 或 password)。本地跑 deploy-stage1.sh 时是 rsync + ssh, 这次同理。
> **注意**: 不要在 Windows PowerShell 直接跑 (没有 WSL / Git Bash 时 bash 脚本跑不起来)。建议在 WSL 或 Git Bash 里跑步骤 3 的本地脚本, 或者直接 SSH 上 ECS 跑步骤 4 的远程命令。

### 步骤 A: SSH 连 ECS

```bash
ssh root@118.178.120.99
# 验证:
hostname   # 应该返回阿里云 ECS 主机名
df -h /    # 看磁盘空间 (库表会增加, 留 1GB+)
```

### 步骤 B: 备份生产现状 (重要, 回滚用)

```bash
# 在 ECS 上跑
mkdir -p /opt/zjzl-calendar/.bak/pre-r1s6a-$(date +%Y%m%d-%H%M%S)
cd /opt/zjzl-calendar
cp -a server/dist .bak/pre-r1s6a-*/server-dist.bak
cp -a server/prisma/data.db .bak/pre-r1s6a-*/data.db.bak
sqlite3 server/prisma/data.db ".backup '.bak/pre-r1s6a-'$(date +%Y%m%d-%H%M%S)'/data.db.snapshot'"
ls -la .bak/   # 确认备份存在
echo "BACKUP_OK"
```

### 步骤 C: 本地拉代码并 rsync 到 ECS

```bash
# 在本地 Windows / WSL / Git Bash 跑
cd /path/to/协同日历  # 仓库根目录

# 1. 确认本地是干净的最新
git status
git log --oneline -1   # 应该显示 ead6f47c

# 2. rsync 整个仓库到 ECS (保留 node_modules 排除)
rsync -av --delete \
  --exclude=node_modules \
  --exclude=client/node_modules \
  --exclude=server/node_modules \
  --exclude=client/dist \
  --exclude=server/dist \
  --exclude=.env \
  --exclude='*.db' \
  --exclude='*.db-journal' \
  --exclude=logs \
  --exclude='.bak' \
  -e 'ssh -o StrictHostKeyChecking=accept-new' \
  ./ root@118.178.120.99:/opt/zjzl-calendar/
```

### 步骤 D: ECS 远程跑 migrate + build + restart

```bash
# 在 ECS 上跑
ssh root@118.178.120.99 'bash -s' <<'REMOTE'
set -euo pipefail

cd /opt/zjzl-calendar

echo "==[1/7]== git pull (保险, rsync 应该已经同步)"
git fetch origin
git reset --hard origin/master
HEAD=$(git rev-parse --short HEAD)
echo "  HEAD=$HEAD  (期望 ead6f47c)"
[[ "$HEAD" == "ead6f47c" ]] || { echo "HEAD 不对, 中断"; exit 1; }

echo "==[2/7]== server: npm install (lunar-javascript 新增)"
cd server
# 检测 lunar-javascript 是否在 node_modules
if [[ ! -d node_modules/lunar-javascript ]]; then
  echo "  缺 lunar-javascript, npm install"
  npm install --omit=optional --no-audit --no-fund
else
  echo "  lunar-javascript 已在, 跳过 npm install"
fi

echo "==[3/7]== server: prisma generate + migrate"
npx prisma generate
# 老迁移漂移修复 (沿用 stage 1 经验)
for old_mig in 20260609000000_add_completion_evaluation_deliverable; do
  if ! sqlite3 prisma/data.db "SELECT name FROM _prisma_migrations WHERE name='$old_mig';" 2>/dev/null | grep -q "$old_mig"; then
    echo "  标记 $old_mig 为 applied"
    npx prisma migrate resolve --applied "$old_mig" || true
  fi
done
npx prisma migrate deploy
# 确认新表存在
echo "  检查 LibraryAsset / UserQuotaCounter / OrgQuotaCounter:"
sqlite3 prisma/data.db "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%LibraryAsset%' OR name LIKE '%QuotaCounter%';"

echo "==[4/7]== server: tsc build"
npx tsc

echo "==[5/7]== client: pnpm install + build"
cd ../client
if [[ ! -d node_modules ]]; then
  echo "  client node_modules 不存在, pnpm install"
  pnpm install --no-frozen-lockfile
fi
pnpm build
ls -la dist/ | head -5

echo "==[6/7]== 前端部署: dist → /var/www/zjzl.space/"
rm -rf /var/www/zjzl.space/*
cp -r dist/* /var/www/zjzl.space/
echo "  前端部署完成"

echo "==[7/7]== 后端: pm2 restart"
cd ../server
pm2 restart zjzl-calendar
sleep 5
pm2 list | grep zjzl-calendar
pm2 logs zjzl-calendar --lines 30 --nostream

echo "==[done]== 部署流程跑完"
REMOTE
```

### 步骤 E: 验证 (9 + N 项)

```bash
# 在 ECS 上跑, 或 curl 公网地址都行
BASE_URL="https://zjzl.space"

# A1 健康检查
echo "A1: GET $BASE_URL/api/health"
curl -fsS -o /dev/null -w "  status=%{http_code}\n" "$BASE_URL/api/health"

# A2 旧端点不回归
echo "A2: GET $BASE_URL/api/projects (期望 401)"
curl -s -o /dev/null -w "  status=%{http_code}\n" "$BASE_URL/api/projects"

# r0 §2 新端点
echo "B1: GET $BASE_URL/api/dashboard/yearly (期望 401)"
curl -s -o /dev/null -w "  status=%{http_code}\n" "$BASE_URL/api/dashboard/yearly"

# r0 §4 消息中心
echo "B2: GET $BASE_URL/api/messages (期望 401)"
curl -s -o /dev/null -w "  status=%{http_code}\n" "$BASE_URL/api/messages"

# r1 §6a 资料库 (登录后用, 这里只验路由挂载)
echo "C1: GET $BASE_URL/api/library/assets (期望 401, 路由挂载)"
curl -s -o /dev/null -w "  status=%{http_code}\n" "$BASE_URL/api/library/assets"

echo "C2: GET $BASE_URL/api/library/quota/me (期望 401)"
curl -s -o /dev/null -w "  status=%{http_code}\n" "$BASE_URL/api/library/quota/me"

# A8/A9 库表存在性
echo "D1: LibraryAsset / QuotaCounter 表存在"
ssh root@118.178.120.99 "sqlite3 /opt/zjzl-calendar/server/prisma/data.db \"SELECT name FROM sqlite_master WHERE type='table' AND (name='LibraryAsset' OR name LIKE '%QuotaCounter%');\""

# A9 wangtian 5 行 ProjectMember 还在 (不回归)
echo "D2: wangtian@cimc.com ProjectMember 数量 (期望 5)"
ssh root@118.178.120.99 "sqlite3 /opt/zjzl-calendar/server/prisma/data.db \"SELECT COUNT(*) FROM ProjectMember pm JOIN User u ON pm.userId=u.id WHERE u.email='wangtian@cimc.com';\""
```

## 3. 停止条件 (满足才能算完工)

- [ ] **步骤 A**: SSH 通
- [ ] **步骤 B**: 备份完成 (.bak/pre-r1s6a-*/ 内有 server-dist.bak + data.db.bak 或 .snapshot)
- [ ] **步骤 C**: rsync 成功, 无错误
- [ ] **步骤 D**: 7/7 步骤全 OK
- [ ] **步骤 E**:
  - A1 `health` = 200
  - A2 `projects` = 401
  - B1 `dashboard/yearly` = 401 (路由挂载)
  - B2 `messages` = 401
  - C1 `library/assets` = 401
  - C2 `library/quota/me` = 401
  - D1 LibraryAsset + QuotaCounter 表存在
  - D2 wangtian ProjectMember = 5 (不回归)
- [ ] `pm2 list | grep zjzl-calendar` 状态 `online`
- [ ] `pm2 logs zjzl-calendar` 无 ERROR 行
- [ ] 用户登录 zjzl.space 能看到「资料库」导航项
- [ ] 前端 dist 已部署到 /var/www/zjzl.space/

## 4. 回滚预案

如果步骤 D 任何一步失败:

```bash
# 在 ECS 上跑
cd /opt/zjzl-calendar

# 找最新备份
LATEST_BAK=$(ls -1dt .bak/pre-r1s6a-* | head -1)
echo "回滚到: $LATEST_BAK"

# 1) 回滚代码
git reset --hard 6b8151a1  # 回滚到 stage 1 收口版本

# 2) 回滚 dist
rm -rf server/dist
cp -a "$LATEST_BAK/server-dist.bak" server/dist

# 3) 回滚 db (如果有数据迁移影响)
cp -a "$LATEST_BAK/data.db.bak" server/prisma/data.db
# 或者 sqlite 在线备份:
# sqlite3 server/prisma/data.db ".restore $LATEST_BAK/data.db.snapshot"

# 4) 重启
cd server
pm2 restart zjzl-calendar
sleep 3
pm2 list | grep zjzl-calendar
```

## 5. 报告模板

部署完成后, 在 `docs/plans/` 下新建 `2026-06-29-ecs-sync-deploy-report.md`, 内容:

```markdown
# ECS 同步部署报告 — ead6f47c

> 作者: zjzl-deploy
> 日期: 2026-06-29 HH:MM (Asia/Shanghai)
> 状态: ✅ ALL PASS / ❌ FAILED at step X

## 部署命令 (按顺序)

\`\`\`
[ssh 步骤 A]
[rsync 步骤 C 输出]
[步骤 D 7/7 输出]
\`\`\`

## 验证结果

| # | 端点 / 表 | 期望 | 实际 | 结果 |
|---|----------|------|------|------|
| A1 | /api/health | 200 | X | ✅ |
| A2 | /api/projects | 401 | X | ✅ |
| B1 | /api/dashboard/yearly | 401 | X | ✅ |
| B2 | /api/messages | 401 | X | ✅ |
| C1 | /api/library/assets | 401 | X | ✅ |
| C2 | /api/library/quota/me | 401 | X | ✅ |
| D1 | LibraryAsset / QuotaCounter 表 | present | X | ✅ |
| D2 | wangtian ProjectMember | 5 | X | ✅ |

## pm2 状态

\`\`\`
[pm2 list | grep zjzl-calendar 输出]
\`\`\`

## 截图

[登录 zjzl.space 看「资料库」导航项的截图]

## 总结

[X 个端点挂载, X 个表新增, PM 在线确认]
```

---

**报告要求**: 完成后给 orchestrator 一句话摘要 (部署了哪些端点 + 验证结果 + 回滚点), 走 mavis communication send 回 `mvs_04c0b8348e67454ea61db5b1d751633c` (mavis root)。