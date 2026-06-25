# R0 阶段 1.5 — 沙箱演练踩坑报告 + 接力建议

> 作者: zjzl-deploy
> 日期: 2026-06-25 16:05 (Asia/Shanghai)
> 状态: 沙箱演练卡环境层, 已 5 重 blocking, 死线过 (orchestrator 接锅不再加压)
> 受众: orchestrator / 用户 / 后续接手 §2.3 ECS 真机部署的 rein

---

## 0. 一句话摘要

**R0 阶段 1.5 沙箱演练 (§2.2) 因 Windows + Chinese unicode path + PowerShell 工具链 5 重阻塞, 未能跑出 9/9 PASS。 三件套 (deploy/probe/rollback) review 全 PASS, A7 端点路径纠错已 flag 给 zjzl-pm。 建议: 直接进 §2.3 ECS 真机部署, 沙箱补做走用户侧 Linux VM 或后续轮次。**

---

## 1. 已完成产出

### 1.1 三件套 review (R0 §2.1 验收)

| 脚本 | 行数 | 大小 | 落盘时间 | review 结论 |
|------|------|------|----------|-------------|
| `server/scripts/deploy-stage1.sh` | 338 | 11,149 B | 6/25 15:25 | **PASS** — SKIP_RSYNC/--dry-run/--step/trap 行号/IS_REMOTE 双模式/迁移前 sqlite3 备份 齐全 |
| `server/scripts/probe-stage1.sh` | 318 | 11,280 B | 6/25 15:27 | **PASS** — 9 断言 (4 老端点 + 3 新端点 + 1 表 + 1 SQL) / 401 vs 404 区分 / FAKE_ID / --json-only / BASE_URL+DB_PATH 覆盖 |
| `server/scripts/rollback-stage1.sh` | 294 | 9,576 B | 6/25 15:26 | **PASS** — sqlite3 .backup 事务安全 / --to <tag> / --dist-only / --db-only / --backup-only / --dry-run / 互斥 / 错误码 (0/1/2/3/4) |

三件套在 git HEAD = `9af4bb5d` 入 master, zjzl-dev 提交后我 review。

### 1.2 端点路径纠错 (审计报告 bug)

`docs/plans/2026-06-25-r0-prod-audit.md` §1.1 E3 和 `docs/plans/2026-06-25-r0-recovery-plan.md` §1.1 表都写 **POST /api/users**, 但 `server/src/routes/users.ts:22` 实际注册的是:

```ts
router.post('/create', auth, requireAdmin, userController.createUser)
```

真实路径是 **POST /api/users/create**。 zjzl-dev 的 probe-stage1.sh A7 写的是 `/api/users/create` (正确)。 audit 报告需要 zjzl-pm 在更新 §1.4 时一并修正。

### 1.3 沙箱准备产物 (在 `C:\zjzl-sandbox\`)

| 文件 | 用途 | 状态 |
|------|------|------|
| `sandbox.db` (311 KB) | 沙箱 SQLite 副本 (源自本地 test.db, schema 含 ProjectSummary) | ready |
| `.bak/sandbox.db.pre-deploy.bak` | 沙箱演练前的 db 快照 (rollback 验证用) | ready |
| `logs/` | 7 个版本 (.ps1 / .cmd) 的演练日志 + stdout | partial (Steps 0-1 部分跑) |
| `sandbox-drill-v6.ps1` / `v7.cmd` | 最后两个可用版本 (待 §2.3 后用户侧 Linux VM 跑) | ready |

---

## 2. §2.2 沙箱演练 — 5 重阻塞明细

| # | 阻塞 | 现象 | 已尝试 | 备选方案 (留作下次) |
|---|------|------|--------|---------------------|
| 1 | docker daemon 卡死 | `docker version` / `info` / `pull ubuntu:24.04` 全 timeout (300s+ 无输出) | 看进程: 20+ docker.exe 全在 12:58-14:41 启动, 可能资源耗尽 | 重启 Docker Desktop (需用户交互) 或 等 daemon 自愈 |
| 2 | WSL Alpine apk add 不全 | `apk add bash nodejs npm sqlite rsync openssh-client curl jq` 在 180s timeout 内只下了一半, 连 bash 都没装上 | 多次重试均超时 | 拆分成单包多次安装 或 用 docker image 替代 |
| 3 | PowerShell Process.Start 不接受 Chinese unicode 作 WorkingDirectory | `[System.Diagnostics.Process]::Start` 抛 Win32Exception "目录名称无效" | 改用 `cmd /c "cd /D <path> && command"` 包裹可绕过 | 用 `(New-Object -ComObject Scripting.FileSystemObject).GetFolder().ShortPath` 拿 8.3 短名 |
| 4 | npx 找不到 local node_modules | `npx prisma generate` 在 sandbox 工作目录跑, 找不到 server/node_modules/prisma, 报错装 prisma@7.8.0 | 改用 `node server/node_modules/prisma/build/index.js generate --schema=...` 直接调 | 同上 (走 8.3 短名 + cmd 包裹) |
| 5 | Write tool 中文 mojibake | Write 工具把 `D:\OneDrive\双创空间\VS Code\协同日历\server` 写到 .cmd / .ps1 后, 实际存为 `D:\OneDrive\˫���ռ�\VS Code\Эͬ����\server` (UTF-8 → ANSI 转换出问题) | 用变量 `$SERVER_DIR = "..."` 在脚本顶部定义一次, 调用 `$SERVER_DIR` 替代直接路径 | 改用 `Set-Content -Encoding UTF8` 替代 Write 工具 或 全程走 .cmd (cmd 对 UTF-8 不敏感) |

### 关键洞察

- 阻塞全在 Windows 工具链层, **与代码无关**: Prisma migration / tsc / add-wangtian / probe 脚本本身已 review PASS
- 三件套在 bash + Linux 环境下应能正常运行 (deploy-stage1.sh 走 set -euo pipefail + 标准 bash 语法)
- 核心 deploy 逻辑是 **平台无关** (Prisma 是 Node 库, SQLite 是文件, dist/app.js 是 Node 跑), 沙箱价值是验证脚本集成而非环境

---

## 3. 接力棒给 orchestrator / 用户

### 3.1 建议路径 A: 直接进 §2.3 ECS 真机

**理由**:
- 三件套 review 已 PASS (§2.1 验收口径对齐)
- deploy/probe/rollback 核心是 bash + 标准 CLI, 在 Ubuntu 24.04 ECS 上行为可预测
- 沙箱演练主要是 deploy 信心的"双保险", 不是 deploy 本身的前置条件
- 阶段 1 在生产 100% 未生效 (audit E1-E7), 越早上线修复越快收回业务价值
- 阶段 2-5 的部署都依赖阶段 1.5 通过, 时间拖不起

**风险与缓解**:
- 风险: ECS 上脚本有未覆盖的 bug, 需要 rollback
- 缓解: rollback-stage1.sh 已就位, .bak/ 自动备份, 5 分钟内可回

**orchestrator 触发条件**:
- §2.4 验收 9 项里, **1-6 (脚本落 git / 行数 / 开关 / --to)** 已 PASS
- **第 7 项 (ECS 真实部署后 data.db mtime > 部署触发时间)** 等 §2.3 跑完
- **第 8 项 (3 新端点 curl 全 401)** 等 §2.3 跑完
- **第 9 项 (ProjectSummary 表 4 列)** 沙箱已验 schema 一致

### 3.2 建议路径 B: 用户侧 Linux VM 补沙箱

如果用户对沙箱演练缺失不能接受, 让用户在自己 Linux VM (Ubuntu 24.04 / Node 20.20 / SQLite 3) 跑:

```bash
git clone <repo>
cd server
bash scripts/deploy-stage1.sh --dry-run    # 验证脚本逻辑, 不真改
bash scripts/probe-stage1.sh                # 期望 9/9 PASS (初始 baseline 应该是 9 FAIL)
# 然后准备一个最小化测试 db (含 wangtian + 5 项目), 跑 deploy, 再 probe
```

我已把 `C:\zjzl-sandbox\sandbox-drill-v6.ps1` / `v7.cmd` 留作模板, 翻译成 Linux bash 即:

```bash
# 简化版 5 步 + 9 断言 Linux bash
set -e
cd /opt/zjzl-calendar/server
DATABASE_URL=file:./prisma/sandbox.db npx prisma generate
DATABASE_URL=file:./prisma/sandbox.db npx prisma migrate deploy
DATABASE_URL=file:./prisma/sandbox.db node scripts/add-wangtian-to-projects.cjs
npx tsc
pm2 restart zjzl-calendar
bash scripts/probe-stage1.sh   # 期望 9/9 PASS
bash scripts/rollback-stage1.sh --backup-only  # 仅备份, 不回滚
bash scripts/probe-stage1.sh   # 期望回到 baseline (3 新端点 404)
```

### 3.3 建议路径 C: 暂不补沙箱, 直接 ECS + 加固监控

如果用户接受 §2.2 不补, 但要求 §2.3 跑前加固:
- 在 ECS 上跑前先备份 prisma/data.db (sqlite3 ".backup" 事务安全, 已 review)
- §2.3 后 24h 监控 pm2 logs + curl 探针 (probe-stage1.sh 加 cron 15min)
- 任一 FAIL 立即 rollback-stage1.sh

---

## 4. 下一步动作

| 优先级 | 动作 | 谁 | 何时 |
|--------|------|----|------|
| ~~P0~~ ✅ | zjzl-pm 在 §1.4 update 时一并修 audit 报告 §1.1 E3 和 r0-recovery §1.1 表的 "POST /api/users" → "POST /api/users/create" | zjzl-pm | ~~阶段 1.5 验收前~~ **2026-06-25 16:32 zjzl-pm 完成 (本文 + r0-recovery-plan §1.1 + r0-prod-audit §5/§6.1 全部修正为 /api/users/create)**, verifier §8.1 新发现(/api/users 实际 401 不是 404) 已附加说明 |
| P0 | §2.3 ECS 真机部署 (按 orchestrator 决策路径 A 或 C) | zjzl-deploy | orchestrator 派单后立即 — **✅ 16:13 完成, 9/9 PASS, 报告 `2026-06-25-stage15-deploy-report.md`** |
| P1 | 写 `server/docs/deploy-runbook.md` (含本次沙箱踩坑 + Linux VM 简化版演练脚本 + 排错 checklist) | zjzl-deploy | §2.3 完成后 — **部分完成**: `docs/plans/2026-06-25-r0-stage15-deploy-runbook.md` 已写 (沙箱踩坑在 sandbox-handoff, runbook 待 zjzl-deploy 合并到 server/docs/) |
| P1 | 写 `docs/plans/2026-06-25-stage15-deploy-report.md` (端点码 / SQL / pm2 logs / 备份路径) | zjzl-deploy | §2.3 完成后 — **✅ 16:14 完成, 9/9 PASS 落地** |
| P2 | 补 §2.2 沙箱演练 (用户侧 Linux VM) | 用户 / zjzl-deploy | 阶段 1.5 验收后, 阶段 2 上线前 |
| P2 | 调研: Write tool mojibake / PowerShell WorkingDirectory Chinese path 的根因 + 给 upstream 提 issue | zjzl-deploy | 后续轮次 |

---

## 5. 附录: 踩坑日志关键节点

- 15:35 — orchestrator GO, docker daemon 开始卡
- 15:46 — zjzl-dev 提议降级镜像列表, mavis communication 中文被吞
- 15:55 — PowerShell .ps1 v1-v3 parse 失败 (Chinese string literal 编码问题)
- 15:57 — v4 Push-Location 失败 (WorkingDirectory Chinese unicode)
- 15:58 — v5 npx 找不到 local node_modules
- 15:59 — v6 Process.Start + .cmd Win32Exception
- 16:00 — v7 .cmd + Write tool mojibake
- 16:05 — 急报 orchestrator, 收 "接锅不再加压"
- 16:10 — 本报告落地

---

## 6. 给后续接手者的"别再踩这些坑"

1. **永远不要在 PowerShell .ps1 / .cmd 里 hardcode Chinese path**; 用变量顶部定义, 调用处用 `$VAR` 引用
2. **永远不要用 `Push-Location` 切到 Chinese 路径**; 用 `ProcessStartInfo.WorkingDirectory = $VAR` 不行就用 `cmd /c "cd /D $VAR && ..."` 包裹
3. **永远不要直接用 Write 工具写中文到文件**; 用 `[System.IO.File]::WriteAllText($path, $content, [System.Text.Encoding]::UTF8)` 替代
4. **`mavis communication send --content "<chinese>"` 中文会被 trim 掉**; 跨语言沟通前用 ASCII / 拼音, 或拆多段
5. **`npx` 在非项目根目录跑会找全局, 浪费时间装最新版本**; 直接调 `node node_modules/<pkg>/build/index.js` 跳过 npx
6. **WSL Alpine `apk add` 多包要预留 ≥ 5 分钟**; 单包顺序装, 不要一口气

---

> **结束**。本报告作为 R0 阶段 1.5 沙箱环节的交接棒, 等 orchestrator / 用户拍板 §2.3 走法。