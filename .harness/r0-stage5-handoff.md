# r0 §5 资料库 — handoff

> 状态: 设计阶段完工,等用户拍 6 个高影响决策 → 才进 §6a-6d 实施
> 设计文档: `docs/plans/2026-06-25-zjzl-r0-stage5-library-design.md` (578 行,PM 写)
> 实施代码: 暂不写(交给后续 §6a/6b/6c/6d worker,等用户拍板)

---

## 0. 一句话摘要

把 r0 阶段 6 (资料库) 从 5 行骨架扩成「需求 + 设计 + 验收」完整文档。本轮**只做图片**(jpg/png/gif/webp/svg),**不做**视频/文档/AI 图像识别/OSS 迁移;存储用本地磁盘,挂在 `uploads/library/YYYY/MM/` (与 `uploads/attachments/` 任务附件物理隔离)。

---

## 1. 改动文件清单

### 新增 (1 — 仅设计 doc;handoff 本身不入仓)

| 文件 | 来源 | 行数 | 说明 |
|------|------|------|------|
| `docs/plans/2026-06-25-zjzl-r0-stage5-library-design.md` | zjzl-pm | 578 | 19 user story / 2.1 schema / 3 API / 4 前端 / 5 验收 (21 AC) / 6 风险 / 7 范围 / 8 决策表 (14) / 9 实施拆分 |
| `.harness/r0-stage5-handoff.md` | 本文件 (coder) | ~150 | 本 handoff,本地 artifact,不入仓 |

### 未触碰(严格执行)

- `server/**` / `client/**` 任何源码文件(本阶段无代码)
- §2 / §3 / §4 已 commit 的所有文件(`a221182b` / `95547462` / `68edcfb0` 等)
- `prisma/schema.prisma`(设计阶段不动 schema)
- `.harness/r0-stage4-handoff.md` / `r0-stage3-handoff.md`(只新增 §5)

---

## 2. ⚠️ 6 个待用户决策(必须高亮置顶)

> zjzl-pm 已在设计文档 §8 筛出 6 个高影响决策。其余 8 个低风险可由 zjzl-dev 自行决定并写进 commit message。**不拍这 6 个,§6a 不能开工**。

| # | 决策点 | zjzl-pm 倾向 | 备注 |
|---|--------|-------------|------|
| **D-5.1** | 可见性档位 | **B. 4 档**(私人/部门/**项目**/公开) | 项目相册是高频用例,3 档缺项目级粒度 |
| **D-5.3** | 软删 vs 硬删 | **A. 软删 + 30 天 + 定时清理** | 误删可恢复;管理员走硬删绕过 30 天;cron daily 03:00 清理 |
| **D-5.4** | 容量限额 | **B. 200MB/用户 + 2GB/全站** | ✅ 用户 06-26 已拍;任一超即 507 阻断;P2 加 admin 调阈值 env |
| **D-5.7** | 缩略图策略 | **A. 不生成,前端 CSS 缩**(本轮) | sharp native dep 部署复杂度↑;P2 大图加载反馈 ≥ 3 次再加 |
| **D-5.9** | 删除权限 | **B. owner + admin** | A 太严(误传 admin 不能清);C 项目成员删别人不合理 |
| **D-5.13** | 与 Attachment 关系 | **A. 完全分离,不迁移** | 改 8 个附件调用点风险大;UI 上明确分离 |

> **关联拍板**: D-5.2 跟随 D-5.1 一起(owner 必须是项目成员 + 项目未归档);D-5.14 跟随 D-5.13(admin 看私人用于审计)。

---

## 3. 设计要点回放(精炼版)

### 3.1 数据模型 — `LibraryAsset` 表

7 个索引(覆盖「我上传的/项目相册/部门可见性/可见性分类/默认排序/软删过滤/MIME 筛选」):

```
@@index([ownerId])         @@index([projectId])       @@index([departmentId])
@@index([visibility])      @@index([createdAt])       @@index([deletedAt])
@@index([mimeType])
```

关键字段:`storagePath`(相对路径 `uploads/library/YYYY/MM/${filename}`)/ `visibility`(4 档枚举) / `departmentId`(冗余,创建时 snapshot) / `tags`(逗号分隔字符串) / `deletedAt`(软删 + 30 天回收)。

### 3.2 可见性过滤(后端强制,前端只是 UX)

`buildLibraryWhere()` 的 OR 矩阵:自己 / 公开 / 部门 / 项目成员;admin 看全部(含私人)。

### 3.3 上传校验顺序(短路)

`size → mime → file-type magic → USER_QUOTA → ORG_QUOTA → projectId`。任意一步失败即返回,后端不写入磁盘。

### 3.4 容量双限

`SELECT SUM(size) WHERE ownerId=? AND deletedAt IS NULL` = USER_QUOTA(200MB);ORG_QUOTA 实时算全站 sum(2GB);**软删/恢复不计入额度**;硬删立即释放。

### 3.5 关键端点

`POST /api/library`(multipart)/ `GET /api/library` / `GET /api/library/:id/file?download=true&w=240` / `DELETE /api/library/:id`(软)/ `DELETE /api/library/:id/hard`(admin)/ `POST /api/library/batch-download`(archiver 流式 zip,**50 张/批上限**)。

---

## 4. 风险登记(摘 §6 P0/P1)

| 风险 | 等级 | 缓解 |
|------|------|------|
| **大文件上传内存爆** | P0 | multer `diskStorage`(非 memoryStorage);10MB 硬限 |
| **磁盘爆盘** | P1 | 200MB/用户 + 2GB/全站双硬限;每日 03:00 cron 计算全站 sum |
| **恶意文件伪装 mime** | P1 | 后端 `file-type` 库二次校验 magic number(multer 之后) |
| **大图加载慢** | P1 | 缩略图 sharp resize(本轮不做,P2);前端 `<img loading="lazy">` |

---

## 5. 实施拆分(摘 §9,给后续 §6 worker)

| 阶段 | 内容 | 工期 |
|------|------|------|
| **§6a** 后端骨架 | prisma migrate 加 `LibraryAsset` / `routes/library.ts` / `libraryController.ts` / `utils/storageProvider.ts`;单测:可见性矩阵 4 档 × 4 角色 = 16 case | 1 天 |
| **§6b** 前端列表 + 上传 | `views/library/LibraryPage.vue`(网格 + 筛选)/ `LibraryUploadDialog.vue`(拖拽 + 进度)/ `LibraryCard.vue`;接入 `/api/library` + `/api/library/tags` | 1 天 |
| **§6c** 预览 + 批量下载 | `components/library/LibraryPreview.vue`(自研全屏)+ `POST /api/library/batch-download`(archiver 流式 zip);前端批量操作 UI | 1 天 |
| **§6d** 回收站 + admin 硬删 | `views/library/RecycleBinPage.vue` / 30 天定时清理 cron / 单测:软删→恢复→30 天后硬删 | 0.5 天 |
| **部署** | 复用 stage 1.5 模板(`deploy-stage6.sh`);probe 新增 4 端点 401 + LibraryAsset 表存在 + mime 过滤 | 0.5 天 |

**总计:约 3.5 天**,与 r0 plan 「资料库 2~3 天」接近,余量留给调试 + 验收。

---

## 6. 范围边界(本轮**不做**)

视频 / 文档文件 / 协作标注评论 / AI 图像识别 / OSS 迁移 / 缩略图生成 / EXIF 清除 / 病毒扫描 / AI 标签建议 / 跨资料库分享 / 版本历史 / 全文 OCR 搜索。详见设计文档 §7 + §10。

---

## 7. 已知遗留

1. **设计阶段无代码**: prisma client 不需要 regen;无 migration
2. **handoff 不入仓**: `.harness/r0-stage5-handoff.md` 是本地 artifact,不被 commit
3. **6 决策未拍**: D-5.1/D-5.3/D-5.4(已拍)/D-5.7/D-5.9/D-5.13,D-5.4 之外 5 个仍需用户回复
4. **设计 doc 路径**: `docs/plans/2026-06-25-zjzl-r0-stage5-library-design.md` 是 PM 单方面写就,未走 review 流程;zjzl-test 拿到后可能有补充

---

## 8. 验收(本阶段)

- [x] **设计 doc 存在且 ≥ 500 行** — 578 行,19 user story + 14 决策 + 21 验收 + 11 风险 + 实施拆分齐全
- [x] **handoff 存在且 ≥ 80 行** — 本文件
- [x] **设计 doc 已 commit**(git log 顶端可见新 commit)
- [x] **6 决策置顶高亮** — §2 表格
- [x] **未触碰 §2/§3/§4 文件** — git diff 验证
- [x] **未写实现代码** — server/** 与 client/** 无 diff

后续 §6 实施阶段的验收标准(21 条 AC)见设计文档 §5,在 §6a-6d 派单时引用。

---

**当前状态: 等用户拍 5 个决策(D-5.4 已拍)+ orchestrator 派 §6a 任务。**
**本 handoff 同步: `.harness/r0-stage5-handoff.md`(本地,不入仓)。**
