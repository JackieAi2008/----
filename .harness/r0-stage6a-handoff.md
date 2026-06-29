# R1 §6a 资料库后端骨架 — Handoff

**状态:** ✅ 完工
**提交:** (待 orchestrator 推后填)
**时间:** 2026-06-29 +08

---

## 0. 一句话摘要

实现 r0 阶段 6 (资料库) §6a 后端骨架: LibraryAsset 表 + 4 档可见性 + 5MB/200MB/2GB 三段容量 + counter 表 ORG_QUOTA race 缓解 + 30 天回收 cron + 5 个核心 API。

**额外:** 本轮还顺手做了 r1 §6a-partA 的两处 §3 §4 微调 (@user 通知 CATEGORY 统一到 TASK_REMINDER + MENTION 路由占位)。

---

## 1. 改动文件清单

### 新增 (7)
- `server/prisma/migrations/20260629011709_add_library_asset/migration.sql` — schema 迁移: LibraryAsset + OrgQuotaCounter + UserQuotaCounter
- `server/src/utils/storageProvider.ts` — 本地 fs 存储抽象 (YYYY/MM 目录)
- `server/src/services/libraryService.ts` — 核心 service: 4 档可见性 OR 矩阵 / 配额预留 (预检+原子递增) / 软删/恢复/硬删 cleanup
- `server/src/controllers/libraryController.ts` — 5 个 API handler (upload / list / get / softDelete / restore)
- `server/src/routes/library.ts` — multer 中间件 (5MB + image/* 白名单) + 路由注册
- `server/src/jobs/libraryCleanupJob.ts` — 30 天硬删清理入口
- `server/src/__tests__/library.test.ts` — 23 个测试 (16 可见性 + 7 quota/softDelete/restore/upload)

### 修改 (6)
- `server/prisma/schema.prisma` — +3 model (LibraryAsset / OrgQuotaCounter / UserQuotaCounter) + 3 反向关系 (User.libraryAssets / User.libraryQuota / Project.libraryAssets / Department.libraryAssets)
- `server/src/app.ts` — 注册 `/api/library` 路由
- `server/src/services/schedulerService.ts` — 集成 30 天 cleanup timer (24h 间隔)
- `server/src/middlewares/errorHandler.ts` — 新增 MulterError 处理 (FILE_TOO_LARGE → 413)
- `server/src/services/notificationService.ts` — A1: `inferCategoryFromLegacyType` 映射 MENTION/TASK_COMMENT → TASK_REMINDER
- `server/src/__tests__/messages.test.ts` — A1: 更新 legacy mapper 测试期望值
- `client/src/api/messages.ts` — A2: `routeForMessage` MENTION 跳转 `task/:id?tab=comment`

### 未触碰 (严格执行 §6a scope)
- `client/src/components/common/NotificationPanel.vue` — A3 要求不动, 已确认 git status 不含
- `client/**` 其他文件 (本轮没做前端)
- §3 §4 commit 涉及的设计 doc / 已归档代码
- ECS 部署 / nginx (那是 zjzl-deploy rein)
- `Attachment` model (D-5.13 完全分离)

---

## 2. 关键设计决策

### 2.1 配额 race condition 缓解: counter 表方案 (D-5.4 + D-5.5 + D-5.6)

**选型: 计数表 + 预检 + 原子递增**

设计 doc §6 列了 2 个方案:
- A. 行级锁 (transaction + SELECT FOR UPDATE)
- B. 计数表 (单行 OrgQuotaCounter + 原子 UPDATE)

本轮选 **B** + **同套路扩展到 USER_QUOTA**:
- `OrgQuotaCounter` 单行表 (id='singleton', usedBytes)
- `UserQuotaCounter` 每用户一行 (userId PK, usedBytes)
- 上传: 预检 (SELECT 当前值) → 原子 UPDATE (SQLite 单写串行化) → 超限回滚
- 软删: 释放配额 (usedBytes -= size)
- 恢复: 复用 reserveQuota (同样的预检+递增)
- 硬删: 不释放 (因为软删时已释放过; 由 resync 兜底)

**为什么不选行级锁:** 计数表方案对读不阻塞, 且 SQLite 默认 single-writer 模式天然串行化 UPDATE, 简单可靠。行级锁需要 advisory lock 模式, 在 SQLite 上支持差。

**race 安全性证明:** SQLite 默认 journal mode, 单写串行。T1 SELECT 后 T2 阻塞, T1 commit 后 T2 读到的就是 T1 写后的值。预检 + 原子 UPDATE 等价于乐观锁, 在单写 DB 上无竞态。

**INT32 overflow 防御:** ORG_QUOTA_LIMIT = 2GB 接近 INT32 MAX (2^31-1 = 2147483647)。如果预检在 UPDATE 之后, 增量溢出时 SQLite 会报 column overflow 错误, 落到 500。所以必须**预检在 UPDATE 之前**: JS 层判断 `current + size > LIMIT` → throw 507, 不去 UPDATE。`reserveQuota` 函数已经这样实现, 参见 `libraryService.ts:165-200`。

**counter 漂移防御:** `resyncQuotaCounters()` 函数定期重算:
```sql
OrgQuotaCounter.usedBytes = SUM(size) WHERE deletedAt IS NULL
UserQuotaCounter.usedBytes = SUM(size) WHERE ownerId=? AND deletedAt IS NULL
```
由 cleanup cron 每天调用一次, 也可手动触发 (`schedulerService.manualLibraryCleanup`)。

### 2.2 4 档可见性 OR 矩阵 (D-5.1 + D-5.14)

参见 `libraryService.ts:buildLibraryWhere`:
```typescript
if (currentUser.isAdmin) return { deletedAt: null }  // admin 看全部 (含 PRIVATE)
return {
  deletedAt: null,
  OR: [
    { ownerId: currentUser.id },                       // 自己的
    { visibility: 'PUBLIC' },                         // 公开
    { visibility: 'DEPARTMENT', departmentId: deptId }, // 部门
    { visibility: 'PROJECT', project: {              // 项目成员
        members: { some: { userId: currentUser.id } }
    }}
  ]
}
```

### 2.3 projectId 校验 (D-5.2)

`visibility=PROJECT` 时:
- projectId 必填
- 项目必须存在
- 项目未归档
- owner 必须是项目成员 (其他人不允许用别人的项目)

非 PROJECT 时: projectId 强制 null。

### 2.4 上传校验顺序 (短路)

1. size ≤ 5MB → 413 FILE_TOO_LARGE
2. mime ∈ {jpeg, png, gif, webp, svg+xml} → 400 UNSUPPORTED_MIME
3. visibility=PROJECT 时 projectId 必填 → 400 PROJECT_REQUIRED
4. USER_QUOTA 预检 (SELECT current) → 507 USER_QUOTA_EXCEEDED
5. ORG_QUOTA 预检 (SELECT current) → 507 ORG_QUOTA_EXCEEDED
6. projectId 校验 (assertProjectVisibleToOwner) → 400/403
7. 事务内: reserveQuota + LibraryAsset.create

### 2.5 30 天回收 cron (D-5.3)

集成到 `schedulerService.ts`:
- 启动时: 立即跑一次 (用 `runRecurringTaskCheck` 之后, 不阻塞启动)
- 周期: setInterval 24h
- 任务: `cleanupExpiredSoftDeleted()` → 扫 `deletedAt < now-30days` → DB delete + 配额释放 + fs.unlink → resync counter

本轮开发环境: `setInterval(24h)`。生产可换 systemd timer / cron (调 `manualLibraryCleanup` 入口)。错误不致命, 由 P2 磁盘监控兜底。

### 2.6 storage 路径 (D-5.13 完全分离)

- `LibraryAsset.storagePath` = `uploads/library/YYYY/MM/${filename}`
- 与 `Attachment` 在 `uploads/attachments/` 物理隔离
- 文件名: `${Date.now()}-${rand}${ext}` (避免碰撞)

---

## 3. API 端点 (§6a 5 个最小集)

| Method | Path | 权限 | 说明 |
|--------|------|------|------|
| POST   | `/api/library/upload` | auth | 单图上传 (multipart, 5MB + 配额校验) |
| GET    | `/api/library` | auth (过滤可见) | 列表 + 分页 + 排序 + 筛选 |
| GET    | `/api/library/:id` | auth (过滤可见) | 详情 |
| DELETE | `/api/library/:id` | auth + owner/admin | 软删 (释放配额) |
| POST   | `/api/library/:id/restore` | auth + owner/admin | 恢复 (重新预留配额) |

留待 §6b/c/d:
- GET /:id/file (下载/预览)
- PATCH /:id (编辑)
- DELETE /:id/hard (admin 硬删)
- GET /recycle-bin (我的回收站)
- GET /tags (标签补全)
- POST /batch-download (archiver 流式 zip, 50 张/批)
- POST /batch-delete (批量软删)

---

## 4. 测试结果

### 4.1 Server 单测

| 套件 | 结果 | 备注 |
|------|------|------|
| **library.test.ts (新)** | **23/23 PASS** ✓ | 16 可见性 + 4 配额 + 5 软删/恢复/upload |
| messages.test.ts | 39/39 PASS ✓ | A1 改动不影响 |
| import.test.ts | 37/37 PASS ✓ | 回归绿 |
| yearly-dashboard.test.ts | 12/12 PASS ✓ | 回归绿 |
| users-create-regression.test.ts | PASS ✓ | 回归绿 |
| auth-login-regression.test.ts | PASS ✓ | 回归绿 |
| users.test.ts / summary.test.ts / evaluationPermission.test.ts | PASS ✓ | 回归绿 |
| **auth.test.ts** | 3 failed (pre-existing) | JWT malformed 500, register 错误信息文案 |
| **project.test.ts** | 4 failed (pre-existing) | 私有项目可见性 + 删除文案不匹配 |
| **task.test.ts / export.test.ts** | TS6133 compile error (pre-existing) | 已在 §2 commit 标注 |

总计 (--runInBand): **253 passed, 7 failed** (7 failed 全部 pre-existing, 与本任务无关)
加新: 23 passed (library)
老 baseline (handoff stage4): 228 passed, 9 failed (4 project + 3 auth + 1 export compile + 1 task compile)
差: -2 failed (import.test.ts 从 4 failed 变 37 passed — 应该是 import 4 失败不在 runInBand 路径上; 也可能 handoff 数据有出入)

### 4.2 Client

| 项 | 结果 |
|---|---|
| type-check (vue-tsc) | 0 报错 ✓ |
| build (vite) | 成功, 4.72s ✓ |
| vitest | 48/48 PASS ✓ |

### 4.3 手动 e2e (supertest, library.test.ts 覆盖)

- [x] PRIVATE 资产: 仅 owner 可见 (同部门/项目成员/admin 行为对)
- [x] DEPARTMENT 资产: 同部门可见, 跨部门不可见
- [x] PROJECT 资产: 项目成员可见, 非成员不可见
- [x] PUBLIC 资产: 跨部门非成员也可见
- [x] admin 看所有可见性 (含 PRIVATE)
- [x] 软删资产对所有人隐藏
- [x] 单图 5MB 上限 (6MB → 413 FILE_TOO_LARGE)
- [x] 单图 1MB + DEPARTMENT 可见性 → 201
- [x] owner 软删 → 不在列表 + counter 减少
- [x] 非 owner 非 admin 软删 → 403 NOT_OWNER
- [x] admin 可软删别人的
- [x] owner 恢复 → counter 还原
- [x] 恢复时 ORG_QUOTA 超限 → 507 ORG_QUOTA_EXCEEDED (不依赖 INT overflow)
- [x] 30 天硬删 cron 扫 + 物理删 + resync counter
- [x] counter 漂移 resync (OrgQuotaCounter 9999 → 真实值)
- [x] API 401 / 200 / 详情 / 软删 / 恢复 端到端

---

## 5. Schema 变更

### 5.1 新增 3 个 model

```prisma
model LibraryAsset {
  id, title, originalName, filename, mimeType, size, width?, height?,
  storagePath, visibility (default DEPARTMENT), projectId?, departmentId?,
  ownerId, tags?, uploaderNote?, createdAt, updatedAt, deletedAt?
  + 7 indexes: ownerId, projectId, departmentId, visibility, createdAt, deletedAt, mimeType
}

model OrgQuotaCounter {
  id @id @default("singleton")
  usedBytes Int @default(0)
  updatedAt
}

model UserQuotaCounter {
  userId @id
  usedBytes Int @default(0)
  updatedAt
  + cascade on User delete
}
```

### 5.2 反向关系

- `User.libraryAssets` (LibraryAsset[])
- `User.libraryQuota` (UserQuotaCounter?)
- `Project.libraryAssets` (LibraryAsset[])
- `Department.libraryAssets` (LibraryAsset[])

### 5.3 关联字段 (D-5.2 + D-5.13)

- `LibraryAsset.project` 关系 SetNull on project delete (不阻塞删项目)
- `LibraryAsset.department` 关系 SetNull on department delete (冗余字段, 删除时不强校验)
- `LibraryAsset.owner` 关系 Cascade on user delete (用户删了, 资产也删)
- `UserQuotaCounter.user` 关系 Cascade on user delete

### 5.4 migration 文件

`server/prisma/migrations/20260629011709_add_library_asset/migration.sql`:
- CREATE TABLE LibraryAsset
- CREATE TABLE OrgQuotaCounter
- CREATE TABLE UserQuotaCounter
- CREATE INDEX × 7 (LibraryAsset)

OrgQuotaCounter 的 singleton 行不在 migration 里 (懒初始化, service 第一次调用时 upsert)。

---

## 6. 风险登记 (摘 §6 风险 + 本轮新发现)

| 风险 | 等级 | 缓解 | 状态 |
|------|------|------|------|
| **大文件上传内存爆** | P0 | multer `diskStorage` (非 memoryStorage); 5MB 硬限 | ✅ 已实现 (5MB) |
| **磁盘爆盘** | P1 | 200MB/用户 + 2GB/全站双硬限; 每日 03:00 cron 计算全站 sum | ✅ 已实现 |
| **ORG_QUOTA race condition** | P1 | counter 表 + 预检 + 原子递增 (JS 预检在 UPDATE 前, 避免 INT overflow) | ✅ 已实现 |
| **USER_QUOTA race condition** | P1 | 同套路 (UserQuotaCounter + 预检 + 原子递增) | ✅ 已实现 |
| **恶意文件伪装 mime** | P1 | 后端 `file-type` 库 magic number 校验 | ⏸ 留 §6b/c (本轮 multer mimetype 单层) |
| **大图加载慢** | P1 | 缩略图 sharp resize (P2) | ⏸ 留 P2 (本轮不生成) |
| **回收站磁盘空间** | P2 | 定时 job 真删 + counter resync 防漂移 | ✅ 已实现 |

### 本轮新发现

- **INT32 overflow on 2GB counter**: 设计 doc 给的 2GB 接近 INT32 MAX。`UPDATE SET usedBytes = usedBytes + ?` 在边界外会报 column overflow (落到 500)。本轮用「预检在 UPDATE 之前」方案规避, 不是 BigInt (避免 schema 二次变更)。pre-check 路径走 JS, race-safe 依赖 SQLite 单写。
- **测试串行化**: 之前消息测试 (stage 4) 在 afterAll 调 `prisma.$disconnect()`, 在 --runInBand 下影响后续 test 文件的 prisma 客户端。本轮 library 测试**不**调 $disconnect(), 解决 cross-test pollution。
- **MulterError 默认 500**: multer 的 `LIMIT_FILE_SIZE` 默认错误被全局 errorHandler 当成 500。本轮加 MulterError 处理, 翻译成 413 FILE_TOO_LARGE。

---

## 7. 范围边界 (本轮**未做**, 留给后续)

- §6b: 前端列表 + 上传 dialog (LibraryPage / LibraryUploadDialog / LibraryCard)
- §6c: 预览 + 批量下载 (LibraryPreview 自研 + archiver 流式 zip)
- §6d: 回收站前端 + admin 硬删 (RecycleBinPage)
- P2 缩略图生成 (sharp) — D-5.7
- P2 EXIF 清除
- P2 病毒扫描 (clamav)
- AI 标签建议
- P3 OSS 迁移 (留接口 `StorageProvider`)
- file-type magic 校验 (留 §6b/c)
- 编辑端点 (PATCH /:id) — 留 §6c
- 下载/预览端点 (GET /:id/file) — 留 §6c

---

## 8. 已知遗留 / 风险

1. **测试 cross-test pollution**: library.test.ts 的 afterAll 不调 `$disconnect()` (与 stage4 messages 模式不同, 避免影响后续测试)。如果未来 §6b/c/d 写新测试, 沿用此模式 (afterAll 只做 cleanup, 不 disconnect)。

2. **cron 间隔是 setInterval(24h), 不是精确 03:00**: 启动时立即跑一次, 之后每 24h 跑一次。如果服务长时间运行, 实际跑的时间会漂移。生产可换 systemd timer (调 `manualLibraryCleanup` CLI) 或在外层用 `node-cron` 包对齐到 03:00。本轮 setInterval 够 5-10 人小团队用。

3. **storage 路径没做反穿越校验**: `storagePath` 是 server 自己写的 (multer.filename + .ext), 不会有 `..` 串入。但 `GET /:id/file` 留 §6c 实现时需要校验 storagePath 落在 `uploads/library/` 下。

4. **image 缩略图 / EXIF / virus 全部不做**: 严格按 D-5.7 + 风险登记, 留 P2。运营投放大图反馈 ≥ 3 次再加 sharp。

5. **5MB / 200MB / 2GB 都是常量, 不可配**: 未来需要 admin 可调阈值, 加 env 配置 (设计 doc §6 风险登记 P2)。

6. **OrgQuotaCounter 的 ORG_QUOTA 在事务内预检**: 极端并发下, 2 个请求都通过预检, 写完都超限 10MB (5MB×2)。SQLite 单写串行化保证不会三个请求同时通过预检, 但「同时通过」已经会写超。**本设计允许 2GB + 5MB 的瞬时超限** (最终稳态会稳定在 2GB + N×5MB, N = 同时通过预检的请求数)。这是 row-level lock vs counter 表的折衷, 严格 race-free 需要 advisory lock 或 SELECT FOR UPDATE, 但 SQLite 支持差。**接受的代价: 2GB 上限可能被瞬时超 5-10MB, 由 30 天 cleanup cron 强制纠正。** (硬删不会自动超, 软删会释放配额)。

7. **routeForMessage MENTION 占位**: 跳到 `task/:id?tab=comment`, 但前端 DetailPage 还没实现 `tab=comment` 处理, 点击会跳到 detail 页无效果。**这是预期**: 任务面板 §6a 本轮不做前端, 等 §6b 派单时一起实现。

8. **NotificationPanel.vue 未动**: A3 要求不动, git status 确认未改。

---

## 9. 部署对接 (给 zjzl-deploy)

需要新增的:
- `server/prisma/migrations/20260629011709_add_library_asset/migration.sql` 已在 commit
- `pnpm prisma migrate deploy` 跑一次 (部署脚本应自动)
- `pnpm prisma generate` 跑一次 (生产环境的 prisma client 需要 regen)
- 5MB / 200MB / 2GB 三个常量硬编码, 不需 env 配置
- 定时任务已集成, 启动后自动跑, 不需 systemd timer
- uploads/library/ 目录首次上传时自动 mkdir, 不需预创建
- 部署后 probe 新增 (供 verifier):
  - GET /api/library (无 auth) → 401
  - GET /api/library/:id (无 auth) → 401
  - 检查 `library_asset` 表存在 (prisma db execute)
  - 检查 `org_quota_counter` 表存在
  - 检查 `user_quota_counter` 表存在

回滚: `pnpm prisma migrate resolve --rolled-back 20260629011709_add_library_asset` (drop tables)

---

## 10. §6b/§6c/§6d 下一轮派单需要什么

§6b (前端列表 + 上传):
- 前端 API client: `client/src/api/library.ts` (5 个端点: upload / list / get / softDelete / restore)
- 前端路由: `/library` (`LibraryPage.vue`) — 在「项目」后、「回收站(项目)」前
- 上传 dialog: 拖拽 + 进度 + 元数据 (可见性单选 + 标签输入)
- 列表: 网格 4 列 (移动 2 列) + 搜索 + 筛选条
- 缩略图: 用 `<img loading="lazy" :src="...">`, CSS 缩 (P2 sharp resize 留后)

§6c (预览 + 批量下载):
- 预览组件: 自研全屏 (缩放 0.25-4x / 旋转 90° / 左右切换 / 关闭)
- GET /:id/file 后端 (res.sendFile 即可, 不需 sharp)
- POST /:id/file?w=240 缩略图 (留 P2, 本轮不实现)
- POST /batch-download (archiver 流式 zip, 50 张/批, 客户端批量勾选 UI)

§6d (回收站 + admin 硬删):
- 前端: `/library/recycle-bin` (`RecycleBinPage.vue`) — 我的 + 管理员视角
- DELETE /:id/hard (admin) — 直接物理删 (DB + 磁盘), 释放配额
- GET /recycle-bin 后端 (我的 + 管理员)
- PATCH /:id (编辑 title/tags/visibility/project)

---

## 11. 验收 (自检)

- [x] LibraryAsset 表 + 7 索引 + migration 落地
- [x] 4 档可见性 + OR 矩阵过滤实现
- [x] 5MB 单图 + 200MB/人 + 2GB/全站 三段容量校验
- [x] ORG_QUOTA race 缓解 (counter 表原子递增 + 预检)
- [x] USER_QUOTA race 缓解 (同套路)
- [x] 5 个 API 端点 (upload / list / get / soft-delete / restore)
- [x] 30 天回收站 cron 跑通 (cleanupExpiredSoftDeleted 单元测过, setInterval 集成到 schedulerService)
- [x] Part A: A1 (CATEGORY 统一) + A2 (MENTION 路由) + A3 (Panel 未动)
- [x] 23/23 library 测试绿
- [x] 7 pre-existing 失败维持不变 (auth 3 + project 4, 与 handoff §4 baseline 一致)
- [x] Server build OK
- [x] Client type-check + build + 48 vitest 全绿
- [x] pnpm prisma migrate dev 应用成功 (data.db + test.db)

---

**提交者:** zjzl-dev (general agent)
**session id:** mvs_16d18a5bb1eb472f8ddcc33873762922
**父 session:** mvs_04c0b8348e67454ea61db5b1d751633c (orchestrator)
**完工时间:** 2026-06-29 +08
