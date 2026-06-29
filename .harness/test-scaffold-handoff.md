# E2E 测试脚手架交接(zjzl-test → orchestrator)

> 交接时间: 2026-06-25 17:59
> 交付 commit: `f8fc8367 test(zjzl): e2e scaffold - Playwright + 4 stage specs (skipped)`
> 用途: r0 §2-§5 阶段验证 / E2E 联调 / 截图回归

## 1. 文件清单(7 个新增/修改)

```
协同日历/
├── client/
│   ├── package.json                          [M] +3 scripts: e2e / e2e:ui / e2e:install
│   ├── playwright.config.ts                  [A] Playwright 配置 (chromium, baseURL=5173, reuse server)
│   └── tests/e2e/                           [A] 测试目录
│       ├── _helpers.ts                      [A] login() / setAuthToken() / snapshot() 公共 helper
│       ├── stage2-yearly-dashboard.spec.ts  [A] §3 年度看板 (5 用例,全 .skip,等 §2 dev)
│       ├── stage3-task-import.spec.ts       [A] §4 任务批量导入 (4 用例,全 .skip,等 §3 dev)
│       ├── stage4-message-center.spec.ts    [A] §5 消息中心 (6 用例,全 .skip,等 §4 dev)
│       └── stage5-library.spec.ts           [A] §6 资料库 (6 用例,全 .skip,等 §5 dev)
```

依赖(package.json devDependencies):
- `@playwright/test` 1.61.1(已装)

## 2. 运行命令

| 命令 | 用途 |
|------|------|
| `cd client && pnpm e2e:install` | 首次/重装:下载 chromium 浏览器 (~150MB) |
| `cd client && pnpm e2e` | 跑所有 enabled 用例 |
| `cd client && pnpm e2e:ui` | Playwright UI 模式(看 case 状态 / 录屏) |
| `cd client && npx playwright test stage2-yearly-dashboard` | 只跑某个 spec 文件 |
| `cd client && npx playwright test -g "切换"` | 按用例名 pattern 过滤 |
| `cd client && npx playwright test --reporter=line` | 单行输出,日志更紧凑 |

启用某个 spec 时,把 `const ENABLED = false` 改为 `true` 即可。

## 3. 环境配置

| 项 | 值 | 来源 |
|----|----|----|
| baseURL | `http://localhost:5173` | vite dev 默认端口 |
| 环境变量 `E2E_BASE_URL` | 可覆盖 baseURL,CI 用 | `playwright.config.ts:use.baseURL` |
| 环境变量 `CI=1` | 启用 CI 模式:串行 + retry x2 + 不自动启 server | `playwright.config.ts:isCI` |
| Chromium 项目 viewport | 1280x800 | `playwright.config.ts:projects` |
| Locale / TZ | `zh-CN` / `Asia/Shanghai` | 让 `formatDate` 等本地化展示稳定 |
| webServer(本地 dev) | 自动启 `pnpm dev` 在 client 目录,reuse existing | `playwright.config.ts:webServer` |
| webServer(CI) | 由调用方启停(节省 60s) | `playwright.config.ts:webServer:isCI ? undefined` |

## 4. 测试产物路径

| 产物 | 路径 |
|------|------|
| HTML 报告 | `client/tests/e2e/playwright-report/` |
| Trace(失败时) | `client/tests/e2e/test-results/` |
| 截图 | `client/tests/e2e/screenshots/{stage}/{case}-{viewport}.png` |
| 视频(失败时) | `client/tests/e2e/test-results/` |

`tests/e2e/screenshots/` 目录首次跑 e2e 后自动生成。建议加进 `.gitignore` 的不追踪行,
只在产出报告时人工 attach。

## 5. 当前 ENABLED 状态

| Spec | ENABLED | 等什么 |
|-------|---------|--------|
| `stage2-yearly-dashboard.spec.ts` | `false` | §2 dev commit → 改 true |
| `stage3-task-import.spec.ts` | `false` | §3a/§3b/§3c dev commit → 改 true |
| `stage4-message-center.spec.ts` | `false` | §4 dev commit → 改 true |
| `stage5-library.spec.ts` | `false` | §5 dev commit → 改 true |

**当前所有 spec 都跳过**,跑 `pnpm e2e` 会立刻 exit 0(没活)。

## 6. 下一步:§2 测试入口

§2 dev commit 后,我会:

### 6.1 拉代码 + 看 diff
```bash
cd 协同日历
git fetch
git log --oneline -5            # 找到 §2 commit hash
git show <commit>               # 看实现:GET /api/dashboard/yearly?year=YYYY + DashboardPage.vue 改造
```

### 6.2 跑 server 单测
```bash
cd server
pnpm test                       # 应含 yearly-dashboard.test.ts,需全绿
```

### 6.3 跑端到端 curl 自测
```bash
TOKEN=$(curl -s -X POST http://localhost:3002/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"e2e-admin@example.com","password":"E2EAdmin123"}' \
  | jq -r .data.token)

# 4 个验收点:
curl -s -o /dev/null -w '%{http_code}\n' \
  http://localhost:3002/api/dashboard/yearly?year=2026 \
  -H "Authorization: Bearer $TOKEN"          # 期望 401 (无 token 时,此行验证保护)

curl -s -w '\n%{http_code}\n' \
  http://localhost:3002/api/dashboard/yearly \
  -H "Authorization: Bearer $TOKEN"          # 期望 400 (无 year)

curl -s -w '\n%{http_code}\n' \
  'http://localhost:3002/api/dashboard/yearly?year=2024' \
  -H "Authorization: Bearer $TOKEN"          # 期望 200 + byMonth 12 行 0

curl -s -w '\n%{http_code}\n' \
  'http://localhost:3002/api/dashboard/yearly?year=abc' \
  -H "Authorization: Bearer $TOKEN"          # 期望 400 (越界)
```

### 6.4 启前端 + 跑 e2e
```bash
cd client
pnpm e2e:install                # 首次跑要下 chromium
# 编辑 stage2-yearly-dashboard.spec.ts: const ENABLED = false → true
pnpm e2e                       # 跑全部 enabled
```

### 6.5 截图 + 报告
```bash
# 截图自动存到 client/tests/e2e/screenshots/stage2/
mkdir -p docs/plans/2026-06-25-stage2-verify-evidence
cp -r client/tests/e2e/screenshots/stage2/* docs/plans/2026-06-25-stage2-verify-evidence/

# 写报告
# docs/plans/2026-06-25-stage2-verify-report.md
# 模板见 inbox-zjzl-test-r0-stages-2345-verify.txt 第 48-55 行
```

### 6.6 单回报给 orchestrator
```
[zjzl-test -> orchestrator] §2 验证: ✅ / ⚠️ / ❌
- commit: <hash>
- server test: N/M
- e2e: N/M
- curl: 401/400/200/200 (4 个用例)
- 截图: docs/plans/2026-06-25-stage2-verify-evidence/
- 报告: docs/plans/2026-06-25-stage2-verify-report.md
- 下一步: ... / 进 §4
```

## 7. 已知遗留 / 风险

- **fixtures 缺失**: `stage3-task-import` 需要 `tests/e2e/fixtures/tasks-valid-100.xlsx` 和
  `tasks-with-1-error.xlsx`,`stage5-library` 需要 `tests/e2e/fixtures/sample.png` + `sample.pdf`。
  spec 里用 `test.skip` 守门,跑时会自动跳过。生成 fixtures 的脚本待 §3a / §5 dev 拍板后写。
- **占位 token**: 所有 spec 里用 `setAuthToken(page, 'placeholder-token', ...)` 跳过 UI 登录。
  §2 dev 提交后,需用真实 admin 账号 + token 替换;或者补 `tests/e2e/fixtures/users.json` 让 helper 读。
- **Chromium 下载**: 约 150MB,首次跑 `pnpm e2e:install` 要 1-3 分钟(取决网络)。CI 上建议预热缓存。
- **webServer 自动启**: 本地开发时 playwright 会自动 `pnpm dev` 启 vite,会复用已有 server。
  如果手动启了 vite 但端口不一致,playwright 会超时,需要先关。

## 8. 队列顺序(再确认)

```
§2 → §4 → §3a → §3b → §3c → §5
```

每个 dev commit 后,orchestrator 单派单 → 我执行 → 单回报。
无 dev commit 时: idle。

---

交接完。orchestrator 自行验证文件树 / 命令即可,无需回 ack。
等 §2 dev commit 派单。