# P1 HOTFIX 回归锁测试报告(2026-06-25 r1)

> 测试经理:`zjzl-test`
> 对应派单:[P1 回归用例派单] /api/users/create + /api/auth/login 500 修复回归锁
> 对应 hotfix:`b122a966 fix(server): P1 hotfix - /api/users/create 500 (User.nickname 改 nullable)`
> 报告时间:2026-06-25 17:01 (Asia/Shanghai)

## 1. 交付清单

| 文件 | 类型 | 用例数 | 状态 |
|------|------|--------|------|
| `server/src/__tests__/auth-login-regression.test.ts` | 新建 | 22 | ✅ PASS |
| `server/src/__tests__/users-create-regression.test.ts` | 新建 | 23 | ✅ PASS |
| `docs/plans/2026-06-25-p1-hotfix-regression-report.md` | 本报告 | — | ✅ |

合计 **新增 45 个用例**,全部通过。

## 2. 回归锁覆盖矩阵

### 2.1 /api/auth/login(22 用例)

| 维度 | 用例 | 覆盖 |
|------|------|------|
| 正常路径 | 1 | 正确邮箱+密码 → 200 + token + user(不含 password 字段) |
| 业务拒绝 | 3 | 邮箱不存在 → 401 / 密码错误 → 401 / 禁用账号 → 403 |
| 输入校验 | 6 | 空 body / 缺 email / 缺 password / 格式不合法 / 空字符串 |
| **错误契约锁** | 12 | 每条用例都断言:`status ∉ {500}` + `Content-Type: application/json` + `success: false` + `message` 非空 |

### 2.2 /api/users/create(23 用例)

| 维度 | 用例 | 覆盖 |
|------|------|------|
| 正常路径 | 2 | 完整字段创建 → 201 / 无 nickname 创建 → 201 (hotfix 后) |
| 权限拒绝 | 4 | 非管理员 → 403 / 无 token → 401 / 空 Bearer → 401 / 无效 token → 401 |
| 业务校验 | 8 | 缺 email / 缺 password / 短密码 / 重复 email / 空字段 / 空 body / 非法 departmentId |
| **错误契约锁** | 9 | 同上:任何错误响应必须结构化 JSON,绝不允许 500 |

### 2.3 关键回归发现(导致 hotfix 触发)

`users-create-regression.test.ts` 中的 **「无 nickname 创建用户」** 用例在 hotfix 之前会失败:

```
expected 201 "Created", got 500 "Internal Server Error"
```

根因:`User.nickname` schema 是 `String`(NOT NULL),controller 写 `nickname: nickname || null`,
触发 `PrismaClientValidationError`,errorHandler 不在白名单,落入默认 500 分支并泄露 Prisma 错误栈。

hotfix `b122a966` 修复:
1. `schema.prisma`:`nickname String` → `nickname String?`
2. 新增 migration `20260625085025_make_nickname_optional`(SQLite RedefineTables,保留所有现有数据)
3. `evaluationController.ts` + `searchController.ts` user map 类型同步(`string` → `string | null`)

修复后该用例 PASS(201),回归锁已生效。

## 3. 基线回归(老 4 套件 7 失败)

完整后端 `npx jest` 结果:
- **Test Suites**: 12 total — **8 passed / 4 failed**
- **Tests**: 149 total — **142 passed / 7 failed**

| 失败套件 | 失败原因 | 是否变化 |
|---------|---------|---------|
| `task.test.ts` | TS6133 `let collaboratorToken`(声明未用)+ `let outsiderId`(声明未用) | ✅ 无变化 |
| `export.test.ts` | TS6133 `const today`(声明未用) | ✅ 无变化 |
| `project.test.ts` | 4 个 runtime 失败(权限/状态相关) | ✅ 无变化 |
| `auth.test.ts` | 3 个 runtime 失败(message toContain / JWT 500) | ✅ 无变化 |

**结论:7 个基线失败全部未变化,未引入新故障。**

注:`auth.test.ts` 中 `应该拒绝格式错误的JWT → expected 401, got 500` 是 `middlewares/auth.ts:52` 的同类 500 bug,基线里就有,**不在本轮修复范围**(recovery plan §0)。

## 4. 错误契约锁(本报告核心价值)

测试通过 helper `expectStructuredError(res, allowedStatuses)` 强制约束:

```ts
function expectStructuredError(res, allowedStatuses) {
  expect(allowedStatuses).toContain(res.status)
  expect(res.status).not.toBe(500)                              // ← 锁住:不允许 500
  expect(res.headers['content-type']).toMatch(/application\/json/) // ← 锁住:JSON 而非 HTML
  expect(typeof res.body).toBe('object')
  expect(res.body.success).toBe(false)
  expect(typeof res.body.message).toBe('string')
  expect(res.body.message.length).toBeGreaterThan(0)
}
```

未来若有人重构路由/middleware 破坏了「错误响应 = 结构化 JSON + 正确 status code」契约,
这些 21 个用例(12 + 9)会立刻失败并定位问题。

## 5. E2E

**本轮未做 E2E。** 原因:
- 本次派单明确是「P1 回归用例」(backend Jest 单元/集成测试),非「阶段交付」
- r0 阶段 1.5 部署验收已在 commit `642e1b3f` 闭环(verifier §8 PASS)
- 用户管理核心路径(登录 + 创建用户)的 server-side 契约已由本批测试锁住
- 关键路径 UI 截图对比属 `zjzl-test` 「阶段交付前」职责,本 P1 不触发该流程

如需 E2E 覆盖,需明确派单(playwright-mcp 已在 `.playwright-mcp/` 可用)。

## 6. 构建

- `pnpm --filter server build` (即 `tsc`):✅ clean,无 TS 错误
- `pnpm --filter client test:run`:✅ 48/48 PASS(基线 48 个前端测试仍全绿)

## 7. Stop when 自检

- [x] 全部新单测通过,测试报告已 commit(本文件)
- [x] 老基线 4 个失败套件失败原因未恶化(7 失败,与 hotfix 前一致)
- [x] 关键路径 server-side 契约已锁定
- [x] 已向 orchestrator 一句话回报(本报告 + 下条 communication send)

## 8. 阻塞项

无。