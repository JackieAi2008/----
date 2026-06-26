# R0 阶段 5 — 资料库（图片）需求拆解 + 设计

> 作者: zjzl-pm
> 日期: 2026-06-25 17:50 (Asia/Shanghai)
> 输入: `docs/plans/2026-06-24-zjzl-feedback-r0-plan.md` §6 (骨架) + inbox `.harness/inbox-pm-stage5.txt` (任务清单)
> 输出对齐: 可直接交付 zjzl-dev 全栈开发 + zjzl-test 验收

---

## 0. 一句话摘要

把 r0 阶段 6 (资料库) 从 5 行骨架扩成「需求 + 设计 + 验收」完整文档。本轮只做**图片** (jpg/png/gif/webp/svg),**不做**视频 / 文档 / AI 图像识别 / OSS 迁移;存储用本地磁盘,挂在 `uploads/library/` (与 `uploads/attachments/` 任务附件物理隔离)。

---

## 1. 需求清单 (19 条 user story)

### 1.1 上传 (4 条)

```
US-5.1.1  As a 普通用户
            I want to 在资料库页点「上传」按钮,从本地选 1 个或多个图片文件
            so that 我能把日常工作照片 (活动现场 / 报表截图 / 海报) 集中归档,跨项目复用

US-5.1.2  As a 普通用户
            I want to 直接把图片拖拽到上传区域
            so that 不用走「点 → 弹窗 → 选文件」三步,快速上传

US-5.1.3  As a 普通用户
            I want to 上传时看到每个文件的进度条 (X / N 个完成, 第几个 X%)
            so that 批量上传 10+ 张时知道进度,不会以为卡死

US-5.1.4  As a 系统管理员
            I want to 看到任何用户上传失败的具体原因 (单文件超 10MB / 非图片 mime / 总量超限)
            so that 我能定位是不是系统限制还是用户操作问题
```

### 1.2 列表 (4 条)

```
US-5.2.1  As a 普通用户
            I want to 在资料库主页看到所有"我可见"的图片,以卡片网格展示 (缩略图 + 标题)
            so that 我能快速浏览找图

US-5.2.2  As a 普通用户
            I want to 顶部有搜索框,按标题 / 标签 / 上传人搜索
            so that 1000+ 张时不靠肉眼翻

US-5.2.3  As a 普通用户
            I want to 顶部筛选条可按: 上传人 / 项目 / 时间段 / 可见性 (公开/部门/项目/私人) / 标签 筛选
            so that 我能把"我部门上传的本周图片"或"某项目所有图片"快速圈出来

US-5.2.4  As a 普通用户
            I want to 列表按上传时间 / 文件名 / 大小 排序,翻页 (默认 24/页)
            so that 大量图片时不一次加载所有
```

### 1.3 预览 (3 条)

```
US-5.3.1  As a 普通用户
            I want to 点缩略图弹出全屏预览,支持图片缩放 (滚轮) + 旋转 (R 键 / 按钮) + 关闭 (Esc)
            so that 我能看清细节 (报表数字、活动现场人物)

US-5.3.2  As a 普通用户
            I want to 在预览中按 ← / → 切换上一张 / 下一张
            so that 我能连续看一批活动现场照片,不用关再开

US-5.3.3  As a 普通用户
            I want to 预览时显示元数据面板: 标题 / 上传人 / 上传时间 / 标签 / 关联项目 / 文件大小 / 图片尺寸
            so that 我能看到图是谁拍的、什么时候拍的、关联哪个项目
```

### 1.4 下载 (2 条)

```
US-5.4.1  As a 普通用户
            I want to 单张图片下载按钮,文件名保留原始文件名
            so that 下载后文件可识别 (不像 cuid 乱码)

US-5.4.2  As a 普通用户
            I want to 多选图片后批量下载为 zip
            so that 一次拿 10 张活动现场照片不用点 10 次
```

### 1.5 删除 (1 条)

```
US-5.5.1  As a 普通用户
            I want to 我自己上传的图片可删除 (软删, 30 天回收期);系统管理员可硬删任何图片
            so that 误传的能撤回,但恶意上传管理员能立刻清除
```

### 1.6 权限 / 可见性 (3 条)

```
US-5.6.1  As a 普通用户
            I want to 上传时可设可见性: 私人 (仅自己) / 部门 (同部门可见) / 公开 (全员可见) / 项目 (某项目成员可见)
            so that 我能把敏感照片 (含个人身份证号) 设为私人,工作照片设公开

US-5.6.2  As a 普通用户
            I want to 列表 / 搜索自动只显示我可见范围内的图片
            so that 我看不到别人设私人的照片 (不需要前端隐藏,后端过滤)

US-5.6.3  As a 系统管理员
            I want to 我能看到所有图片 (含私人),用于审计
            so that 出问题时能追溯
```

### 1.7 元数据 / 编辑 (2 条)

```
US-5.7.1  As a 普通用户
            I want to 我自己上传的图片可编辑标题 / 标签 / 可见性 / 关联项目 (限本人)
            so that 上传后还能补标签、改可见性

US-5.7.2  As a 普通用户
            I want to 标签支持自由文本 + 自动补全 (基于已有标签)
            so that 多人上传时标签不漂移 (例: 都用「活动现场」而不是「活动」「现场」)
```

---

## 2. 数据模型设计

### 2.1 `LibraryAsset` 表 schema

```prisma
model LibraryAsset {
  id            String   @id @default(cuid())
  title         String                              // 用户可编辑标题,默认 = 原始文件名去后缀
  originalName  String                              // 原始文件名 (下载时还原)
  filename      String                              // 磁盘文件名: `${timestamp}-${rand}${ext}`
  mimeType      String                              // image/jpeg | image/png | image/gif | image/webp | image/svg+xml
  size          Int                                 // bytes
  width         Int?                                // 图片宽 (px);svg 可空
  height        Int?                                // 图片高 (px);svg 可空
  storagePath   String                              // 相对路径: uploads/library/YYYY/MM/${filename}
  visibility    String   @default("DEPARTMENT")     // PRIVATE | DEPARTMENT | PUBLIC | PROJECT
  projectId     String?                             // visibility=PROJECT 时必填
  departmentId  String?                             // 冗余字段,加速部门可见性过滤;创建时 snapshot
  ownerId       String                              // 上传人
  tags          String?                             // 逗号分隔: "活动现场,海报,2024年度"
  uploaderNote  String?                             // 上传者可写一句话说明
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  deletedAt     DateTime?                           // 软删;30 天后定时 job 硬删 + 磁盘清理

  owner      User       @relation("LibraryAsset_owner", fields: [ownerId], references: [id], onDelete: Cascade)
  project    Project?   @relation(fields: [projectId], references: [id], onDelete: SetNull)
  department Department? @relation(fields: [departmentId], references: [id], onDelete: SetNull)

  @@index([ownerId])
  @@index([projectId])
  @@index([departmentId])
  @@index([visibility])
  @@index([createdAt])
  @@index([deletedAt])                              // 软删过滤 + 回收站扫描
  @@index([mimeType])                               // 类型筛选
}
```

### 2.2 与现有模型的关系

```
User ──┬── LibraryAsset (owner)
       └── Department (departmentId)

Project ── LibraryAsset (projectId, nullable, onDelete SetNull)

Department ── LibraryAsset (departmentId, nullable, onDelete SetNull)
              │
              └── User (department)

Task → Comment.images (JSON 字符串) ─→ 不直接关联 LibraryAsset (注释内嵌图保持现状)
```

**关系说明**:
- `LibraryAsset` 与 `Attachment` (任务附件) **物理隔离**: Attachment 在 `uploads/attachments/`,LibraryAsset 在 `uploads/library/YYYY/MM/`,**两个表互不引用**。
- `Comment.images` (JSON 字符串) 也独立,**不**升级到 LibraryAsset;避免 r0 范围膨胀。

### 2.3 索引策略

| 索引 | 用途 |
|------|------|
| `@@index([ownerId])` | "我上传的" 列表 + 删除时校验所有权 |
| `@@index([projectId])` | "项目相册" 视图 (`projectId IS NOT NULL`) |
| `@@index([departmentId])` | 部门可见性过滤 (`visibility=DEPARTMENT AND departmentId = myDeptId`) |
| `@@index([visibility])` | 按可见性分类聚合 |
| `@@index([createdAt])` | 默认按上传时间倒序 |
| `@@index([deletedAt])` | 软删过滤 (`deletedAt IS NULL`) + 回收站扫描 |
| `@@index([mimeType])` | 类型筛选 ("只看 PNG") |

### 2.4 软删 vs 硬删

**决定: 软删 + 30 天回收期 + 定时硬删**

- 上传者删除 → `deletedAt = now()`,前端隐藏
- 管理员硬删 → 真删 (DB 行 + 磁盘文件),**不**走 30 天回收
- 定时 job (cron daily 03:00): `DELETE WHERE deletedAt < now() - 30 days` + `fs.unlink(storagePath)`
- 30 天内可"恢复" (管理员 UI 上有"回收站"页)

### 2.5 与 `Attachment` 的边界

| 维度 | `Attachment` (任务附件) | `LibraryAsset` (资料库) |
|------|-------------------------|-------------------------|
| 范围 | 单个任务 | 全局 / 部门 / 项目 |
| 用途 | 任务附件 (Word/Excel/PDF/zip/图片) | 图片档案,跨项目复用 |
| 存储路径 | `uploads/attachments/` | `uploads/library/YYYY/MM/` |
| 文件类型 | 10+ mime (含文档) | 仅 image/* 5 种 |
| 大小限制 | 10MB | 10MB/单 + **200MB/用户 + 2GB/全站** |
| 可见性 | 任务可见 = 任务成员可见 | 4 档 (私人/部门/项目/公开) |
| 软删 | 无 (硬删) | 30 天软删 |
| 删除权限 | 上传者 + 任务管理员 | 上传者 (软) + 管理员 (硬) |

**迁移策略**: 旧的 `Attachment` 行**不**迁移到 LibraryAsset。任务附件保留不动;新功能用 LibraryAsset。

---

## 3. API 设计

### 3.1 端点清单

| Method | Path | 权限 | 说明 |
|--------|------|------|------|
| GET | `/api/library` | auth (过滤可见) | 列表 + 分页 + 筛选 + 排序 |
| GET | `/api/library/:id` | auth (过滤可见) | 单条详情 |
| POST | `/api/library` | auth | 上传 (multipart/form-data, `file` 字段) |
| GET | `/api/library/:id/file` | auth (过滤可见) | 下载 / 预览 (返回 `image/*` 流) |
| PATCH | `/api/library/:id` | auth + 所有者 | 编辑标题 / 标签 / 可见性 / 关联项目 |
| DELETE | `/api/library/:id` | auth + 所有者 | 软删 (30 天可恢复) |
| DELETE | `/api/library/:id/hard` | auth + admin | 硬删 (立即清理磁盘) |
| POST | `/api/library/:id/restore` | auth + 所有者 / admin | 从回收站恢复 |
| GET | `/api/library/recycle-bin` | auth + 所有者 | 我的回收站 (deletedAt NOT NULL) |
| GET | `/api/library/tags` | auth | 标签自动补全 (按使用频次 top 50) |
| POST | `/api/library/batch-download` | auth + ids[] | 批量下载为 zip (流式) |
| POST | `/api/library/batch-delete` | auth + ids[] | 批量软删 (限本人上传) |

### 3.2 关键端点契约

#### GET `/api/library` (列表)

```
Query:
  page=1                       1-based
  pageSize=24                  默认 24,最大 100
  sort=createdAt               createdAt | originalName | size
  order=desc                   desc | asc
  visibility=                  可选,过滤 (admin 可看 PRIVATE)
  projectId=                   可选
  ownerId=                     可选
  tag=                         可选,模糊匹配 tags LIKE '%tag%'
  search=                      可选,模糊匹配 title LIKE '%search%'
  mimeType=image/png           可选,按 mimeType 前缀过滤
  includeDeleted=false         默认 false;true 时仅 admin 看回收站

Response:
{
  items: [{
    id, title, originalName, mimeType, size, width, height,
    visibility, projectId, projectName, ownerId, ownerName,
    tags: ["活动现场", "海报"],
    thumbnailUrl: "/api/library/${id}/file?w=240",  // 缩略图 (后端 sharp resize,可选 P2)
    createdAt, updatedAt
  }],
  total: number,                // 总数 (不含 deletedAt)
  page, pageSize
}
```

#### POST `/api/library` (上传)

```
Request: multipart/form-data
  file:          图片文件 (≤ 10MB, mimeType ∈ image/*)
  title:         可选,默认 = filename 去后缀
  visibility:    PRIVATE | DEPARTMENT | PUBLIC | PROJECT, 默认 DEPARTMENT
  projectId:     visibility=PROJECT 时必填
  tags:          可选,逗号分隔
  uploaderNote:  可选

Response 201:
{
  id, title, originalName, mimeType, size, width, height,
  visibility, projectId, projectName, ownerId, ownerName,
  tags, thumbnailUrl, createdAt, updatedAt
}

Error:
  400 文件类型不支持 / 标题为空 / visibility=PROJECT 但缺 projectId
  413 文件超 10MB
  507 单用户超 200MB (`USER_QUOTA_EXCEEDED`) 或全站超 2GB (`ORG_QUOTA_EXCEEDED`)
```

**校验顺序 (短路)**: size → mime → file-type magic → USER_QUOTA → ORG_QUOTA → projectId。任意一步失败即返回,后端不写入磁盘。USER_QUOTA 校验源 = `SELECT SUM(size) FROM library_asset WHERE ownerId = ? AND deletedAt IS NULL`;ORG_QUOTA 校验源 = 同表不过滤 owner,每次上传实时算 (未上 cron,后续优化)。

#### GET `/api/library/:id/file` (下载 / 预览)

```
Query:
  download=true                 可选;true 时加 Content-Disposition: attachment
  w=240                         可选,缩略图宽;不传返回原图
  h=240                         可选,缩略图高

Response 200:
  Content-Type: <原 mimeType 或 image/webp (缩略图)>
  Body: 二进制流

Error:
  403 不可见
  404 不存在
```

### 3.3 可见性过滤逻辑 (后端强制,前端只是 UX)

```typescript
function buildLibraryWhere(currentUser: User): Prisma.LibraryAssetWhereInput {
  const base = { deletedAt: null };
  const userDept = currentUser.departmentId;
  const isAdmin = currentUser.isAdmin;

  if (isAdmin) return base;  // admin 看全部

  return {
    ...base,
    OR: [
      { ownerId: currentUser.id },                        // 自己的
      { visibility: 'PUBLIC' },                          // 公开
      { visibility: 'DEPARTMENT', departmentId: userDept }, // 部门
      { visibility: 'PROJECT', project: {                // 项目
          members: { some: { userId: currentUser.id } }
      }}
    ]
  };
}
```

### 3.4 错误码约定

| 场景 | 状态码 | body |
|------|--------|------|
| 单文件 > 10MB | 413 | `{ error: 'FILE_TOO_LARGE', limit: 10485760 }` |
| 非 image/* mime | 400 | `{ error: 'UNSUPPORTED_MIME', mimeType: '...' }` |
| 单用户超 200MB | 507 | `{ error: 'USER_QUOTA_EXCEEDED', limit: 209715200, current: <当前用户已用字节数, SUM(size) WHERE ownerId=? AND deletedAt IS NULL> }` |
| 全站超 2GB | 507 | `{ error: 'ORG_QUOTA_EXCEEDED', limit: 2147483648, current: <全站已用字节数, SUM(size) WHERE deletedAt IS NULL> }` |

> **字段语义**: `limit` 是配额上限 (bytes, 常量);`current` 是校验时的实际已用量 (bytes)。前端展示「已用 X MB / 上限 Y MB」时,X = `current / 1048576`,Y = `limit / 1048576` (向上取整到 MB)。
| 编辑非本人 | 403 | `{ error: 'NOT_OWNER' }` |
| 硬删非 admin | 403 | `{ error: 'ADMIN_REQUIRED' }` |
| projectId 不存在 | 400 | `{ error: 'PROJECT_NOT_FOUND' }` |

---

## 4. 前端页面设计

### 4.1 路由 + 导航

```
新增路由:
  /library                     LibraryPage.vue (列表 + 上传入口)
  /library/recycle-bin         RecycleBinPage.vue (回收站, 仅本人 + admin)

导航位置 (MainLayout.vue):
  主菜单新增:
    概览 / 日历 / 项目 / 资料库 / 回收站 / 总结归档
    ↑ 在「项目」和「回收站(项目)」之间插「资料库」
```

**导航位置决策**: 放在「项目」后、「「回收站(项目)」前。
- 资料库是日常高频入口,与「项目」并列;
- 项目级「回收站」是低频,放资料库之后避免混淆。

### 4.2 列表页布局

```
┌────────────────────────────────────────────────────┐
│  资料库                                  [上传] │ ← 顶部工具栏
├────────────────────────────────────────────────────┤
│  [搜索框] [筛选: 项目▼ 可见性▼ 标签▼ 时间▼ MIME▼] │
│         [排序: 上传时间▼ 24/页▼]                  │
├────────────────────────────────────────────────────┤
│  ☐ 全选 (跨页)              [批量下载] [批量删除] │
├────────────────────────────────────────────────────┤
│  ┌──┐ ┌──┐ ┌──┐ ┌──┐                             │
│  │缩│ │缩│ │缩│ │缩│  ← 卡片网格 4 列           │
│  │略│ │略│ │略│ │略│                             │
│  │图│ │图│ │图│ │图│                             │
│  └──┘ └──┘ └──┘ └──┘                             │
│  标题...   标题...   标题...   标题...             │
│  📁 项目    📁 项目    📁 项目    📁 项目         │
│  👤 张三    👤 李四    👤 张三    👤 王田         │
│  2024-12-01 2024-12-02 ...                         │
└────────────────────────────────────────────────────┘
       < 1 2 3 ... 10 >  ← 分页
```

### 4.3 上传对话框 UI

- 触发: 顶部 [上传] 按钮 / 拖拽到列表区
- 步骤:
  1. 文件选择 (拖拽区 + 选文件按钮,支持多选)
  2. 进度条 (每个文件一行: 文件名 / 大小 / 进度 / 状态 / 取消)
  3. 元数据填写 (批量上传时只填一次,应用到所有):
     - 可见性 (单选 + 提示: 公开 = 全员 / 部门 = 本部门 / 项目 = 选项目 / 私人 = 仅自己)
     - 标签 (tag input,自动补全 `/api/library/tags`)
- 失败处理: 每个文件独立显示错误 (multer error 413 / mime 拒绝 / 总量超限),成功的仍写入

### 4.4 预览组件

**方案: 自研** (vue-image-lightbox 这类第三方库未在现有依赖,加新依赖增加 bundle 体积)
- 全屏遮罩
- 图片居中,缩放 (0.25x - 4x, 鼠标滚轮 / 触控双指)
- 旋转 (R 键 / 按钮,90° 增量)
- 关闭 (Esc / 右上 X / 点击遮罩)
- 左右切换 (← → 键 / 按钮)
- 底部信息条 (标题 / 上传人 / 时间 / 尺寸)
- 元数据抽屉 (右侧,点 ℹ️ 展开)

### 4.5 移动端边界

- 不专门做响应式
- 列表卡片网格 ≥ 768px: 4 列, < 768px: 2 列
- 上传对话框在小屏: 全屏 modal
- 预览: 在小屏只支持左右切换,不要求缩放/旋转 (按钮隐藏,提示「请在桌面端查看」)

---

## 5. 验收标准 (21 条)

### 5.1 上传 (4)

- [ ] AC-5.1.1 单文件上传成功,标题默认 = 原文件名去后缀;可见性默认 = DEPARTMENT
- [ ] AC-5.1.2 拖拽 5 个图片同时上传,5 个独立进度条;1 个失败不阻塞其他 4 个
- [ ] AC-5.1.3 上传 11MB jpg → 返回 400 + 友好提示「文件超 10MB 上限」
- [ ] AC-5.1.4 上传 8MB pdf (非 image/*) → 返回 400 + 友好提示「仅支持图片 (jpg/png/gif/webp/svg)」

### 5.2 列表 / 筛选 (3)

- [ ] AC-5.2.1 默认 24/页,按 createdAt desc;切到 48/页正常显示
- [ ] AC-5.2.2 搜索「活动」命中 title LIKE '%活动%' 或 tags LIKE '%活动%' 的图片
- [ ] AC-5.2.3 按项目筛选 → 只显示该项目的图片 (`projectId` 过滤生效)

### 5.3 预览 (2)

- [ ] AC-5.3.1 点缩略图 → 全屏预览,鼠标滚轮缩放 (0.25x - 4x),R 键旋转,Esc 关闭
- [ ] AC-5.3.2 元数据面板正确显示: 标题 / 上传人 / 时间 / 标签 / 关联项目 / 大小 / 图片尺寸

### 5.4 下载 (2)

- [ ] AC-5.4.1 单张下载,文件名 = 原文件名 (例: `IMG_20241201.jpg`)
- [ ] AC-5.4.2 选 5 张 → 批量下载 → 浏览器得到 `library-20241201.zip`, 5 个文件均在

### 5.5 删除 / 回收 (2)

- [ ] AC-5.5.1 用户 A 上传 + 删除 → 列表不显示,但 `GET /api/library/recycle-bin` 可见;30 天内可恢复
- [ ] AC-5.5.2 admin 硬删 → `fs.unlink` 真删磁盘文件,DB 行删除;前端不显示

### 5.6 权限 / 可见性 (3)

- [ ] AC-5.6.1 用户 A 私人图片 → 用户 B `GET /api/library` 不返回 (后端 OR 过滤生效)
- [ ] AC-5.6.2 部门公开图片 → 同部门用户 `GET /api/library` 可见,跨部门不可见
- [ ] AC-5.6.3 admin `GET /api/library` 返回所有 (含私人),含 `ownerName` 标识

### 5.7 容量 / 限额 (4)

- [ ] AC-5.7.1 用户上传到第 N 张使本人总量超 200MB → 返回 507 `USER_QUOTA_EXCEEDED` + 提示「您的资料库空间已满 (200MB),请删除旧图片」
- [ ] AC-5.7.2 用户上传时全站总量已超 2GB → 返回 507 `ORG_QUOTA_EXCEEDED` + 提示「资料库总空间已满 (2GB),请等待管理员清理」
- [ ] AC-5.7.3 软删/恢复操作**不**计入额度 (恢复后重新计入);硬删立即释放
- [ ] AC-5.7.4 错误响应带 `current` 字段,前端能展示「已用 X MB / 上限 Y MB」

### 5.8 元数据编辑 (1)

- [ ] AC-5.8.1 上传者编辑自己图片的标题 / 标签 / 可见性 → DB 同步,刷新可见

---

## 6. 风险登记

| 风险 | 等级 | 触发 | 缓解 |
|------|------|------|------|
| **大文件上传内存爆** | P0 | 上传 > 10MB | multer `diskStorage` (已用,非 memoryStorage);10MB 硬限 |
| **磁盘爆盘** | P1 | 总量无限制 | 200MB/用户 + 2GB/全站双硬限;`du -sh` 监控;每日 03:00 cron 计算全站 sum(size) 作 ORG_QUOTA 校验源 |
| **ORG_QUOTA race condition** | P1 | 多用户并发上传 | `SELECT SUM(size)` 实时算 → 两请求同时通过校验后双双 INSERT,可能短暂超过 2GB |
| **恶意文件伪装 mime** | P1 | 改后缀绕过 mime 过滤 | 后端 `file-type` 库二次校验 magic number (在 multer 之后) |
| **大图加载慢** | P1 | 单图 > 5MB | 缩略图 `sharp` resize → 240x240 webp (P2 必做);前端 `<img loading="lazy">` |
| **EXIF 隐私泄漏** | P2 | 上传照片含 GPS / 设备信息 | sharp resize 时默认 strip metadata (P2) |
| **批量下载 zip 内存** | P1 | 100 张打包 | `archiver` 流式写,不缓存到内存;limit 50 张/批 |
| **回收站磁盘空间** | P2 | 30 天软删占空间 | 定时 job 真删 + 监控 `du -sh uploads/library/.trash` |

> **ORG_QUOTA race condition 详细说明**: 单条 `SELECT SUM(size) WHERE deletedAt IS NULL` 在并发下不安全。两种缓解:
> 1. **行级锁 (短期)**: `prisma.$transaction` + `SELECT ... FOR UPDATE` 在一个 `OrgQuota` 哨兵行(或 Postgres advisory lock)上串行化 ORG_QUOTA 校验 → 简单可靠。
> 2. **计数表 (中期)**: 每日 03:00 cron 把 `SUM(size)` 物化到 `OrgQuotaCounter` 单行表;上传时 `UPDATE counter SET used = used + ? RETURNING used`,超限即拒。原子增量,无竞态。
> §6a 实施时必须选一种落地;不能只靠"实时 SELECT"。USER_QUOTA 同理(同一用户的并发上传)。
| **旧 Attachment 数据迁移** | P3 | 用户期望老附件可见 | 不迁移,UI 上「资料库」与「任务附件」明确分离 |
| **oss 迁移兼容性** | P3 | 下阶段切云存储 | 抽象 `StorageProvider` 接口,本地 fs 实现 + OSS 实现并存 |
| **病毒扫描** | P3 | 恶意文件传播 | 本轮不做;P2 clamav 接入 (上传后 async 扫描,失败置 `isQuarantined=true`) |
| **soft delete 性能** | P2 | 列表查询带 deletedAt 过滤 | 加 `@@index([deletedAt])`;30 天后定时清理 |

---

## 7. 范围边界 (本轮**不做**)

| 项 | 不做原因 | 何时回看 |
|----|----------|----------|
| 视频文件 (mp4 / mov) | 资料库只图片,用户原话 | P1: 用户明确要视频时 |
| 文档文件 (pdf/doc/xlsx) | 已有 `Attachment` (任务附件) 覆盖 | P2: 跨项目文档中心需求时 |
| 协作标注 / 评论 | 资料库是只读档案,非协作 | P2: 用户要「图片讨论」功能时 |
| AI 图像识别 (OCR / 物体识别) | 依赖外部 LLM API,稳定性差 | P2: DeepSeek 多模态 API 稳定后 |
| OSS / 云存储迁移 | 本轮本地 fs 已够 5 人团队 1 年 | P1: 总容量 > 10GB 或 ECS 磁盘报警时 |
| 缩略图生成 (`sharp` resize) | 加 1 个 native dep,部署复杂度↑ | P2: 大图加载慢用户反馈 ≥ 3 次 |
| EXIF 信息清除 | 默认 strip 即可,本轮不显式 | P2: 隐私合规审计要求时 |
| 病毒扫描 | 工程量大 | P2: 安全合规要求时 |
| AI 标签建议 (基于图片内容) | 依赖 AI,本轮标签手动 | P2: AI 多模态 API 就绪时 |
| 跨资料库分享 (生成短链) | 资料库是内网工具 | 不做 (违反产品定位) |
| 版本历史 (替换图片保留旧版) | 容量翻倍 | P2: 合规要求保留修改痕迹 |
| 全文 OCR 搜索 | 依赖 AI | P2: 标签不够用时 |

---

## 8. 决策记录

> **格式**: 决策点 / 选项 / 我的倾向 / 理由 / 待用户拍板

| # | 决策点 | 选项 | 我的倾向 | 理由 | 待用户拍板 |
|---|--------|------|----------|------|-----------|
| **D-5.1** | 可见性档位 | A. 3 档 (私人/部门/公开) / **B. 4 档 (+项目)** / C. 2 档 (私人/公开) | **B. 4 档** | 资料库常用于"项目相册",与项目绑定是高频用例;3 档缺项目级粒度,2 档太粗 | ✅ 需拍板 |
| **D-5.2** | 项目可见性的 projectId 校验 | A. 必填 owner 必须是项目成员 / B. 任意项目 ID 都可 / **C. owner 必须是项目成员 + 项目未归档** | **C** | B 任意项目能选 → 越权;C 限制 owner 必须是成员 + 项目未归档,合理 | (随 D-5.1 一起) |
| **D-5.3** | 软删 vs 硬删 | **A. 软删 + 30 天 + 定时清理** / B. 硬删 (立即删) / C. 软删 + 永久保留 | **A** | 误删可恢复,管理员可绕过;30 天是行业惯例;永久保留会爆盘 | ✅ 需拍板 |
| **D-5.4** | 容量限额 (双层) | A. 200MB 单用户 / **B. 200MB/用户 + 2GB/全站** / C. 500MB 单用户 / D. 不限 | **B. 200MB + 2GB** | 用户拍板:个人 200MB (20 张 10MB 图够个人用),全站 2GB (10 人团队 × 200MB = 2GB 满载,符合「5-10 人小团队」规模假设);两限同时校验,任一超即 507 阻断;P2 可加 admin 调阈值的 env 配置 | ✅ 已拍 (用户 06-26) |
| **D-5.5** | 单文件大小上限 | **A. 10MB** (与 Attachment 一致) / B. 20MB / C. 5MB | **A. 10MB** | 与现有 `Attachment` (10MB) 一致,前端组件复用;5MB 太紧,20MB 加磁盘压力 | (低风险,可不拍) |
| **D-5.6** | mime 过滤是否走 file-type 二次校验 | A. 只 multer mimetype / **B. multer mimetype + file-type magic number** | **B** | A 易被绕 (改后缀);B 用 sharp / file-type 读 magic number,准确 | (低风险,可不拍) |
| **D-5.7** | 缩略图策略 | **A. 不生成,前端 CSS 缩** / B. sharp 生成 240x240 webp 缓存 / C. 按需动态 resize | **A. 不生成** (本轮) | B/C 加 native dep (sharp),部署复杂度↑;本轮 10MB 单图前端 CSS 缩够用,首屏可能慢但可接受 | ✅ 需拍板 (后续 P2 再加 B) |
| **D-5.8** | 批量下载打包上限 | A. 100 张 / **B. 50 张** / C. 不限 | **B. 50 张** | 50 张 × 5MB avg = 250MB zip,单请求安全;100 张 zip 内存风险 | (低风险,可不拍) |
| **D-5.9** | 删除权限 | A. 仅 owner / **B. owner + admin** / C. owner + admin + 项目成员 | **B. owner + admin** | A 太严,误传 admin 不能清;C 项目成员删别人的不合理 | ✅ 需拍板 |
| **D-5.10** | 标签存储 | **A. 逗号分隔字符串** / B. JSON 数组 / C. 独立 `LibraryTag` 表 + 多对多 | **A. 字符串** | 标签是低频编辑 + 简单检索;JSON 难 LIKE;独立表 over-engineering (阶段 6 再升级) | (低风险,可不拍) |
| **D-5.11** | 导航位置 | **A. 主菜单「项目」后** / B. 主菜单「总结归档」后 / C. 「管理」下 (限 admin) | **A. 项目后** | 资料库是日常高频,与项目并列;C 不对,普通用户也用 | (低风险,可不拍) |
| **D-5.12** | 预览组件 | A. vue-image-lightbox / **B. 自研** / C. Element Plus el-image-viewer | **B. 自研** | A 加新 dep + bundle 体积↑;C 依赖 Element Plus;现有 deps 未含,B 自研可控 | (低风险,可不拍) |
| **D-5.13** | 与现有 Attachment 关系 | **A. 完全分离,不迁移** / B. 一次性迁移附件到 LibraryAsset / C. Attachment 改名 LibraryAsset | **A. 完全分离** | B/C 风险大,改 8 个附件调用点;A UI 上明确分离 | ✅ 需拍板 (高影响) |
| **D-5.14** | Admin 看私人图片 | A. 完全不可见 / **B. admin 全可见 (审计)** / C. admin 看 metadata 但不看文件 | **B. admin 全可见** | 审计 + 误传清理需要;C 半权限产品上反直觉 | (随 D-5.13 一起) |

---

## 9. 实施拆分建议 (给 orchestrator)

> 本节不是交付物,是给 orchestrator 排期的辅助建议

**阶段 6a — 后端骨架 (1 天)**
- prisma migrate 加 `LibraryAsset` 表
- `server/src/routes/library.ts` (CRUD + 上传 + 下载 + 批量)
- `server/src/controllers/libraryController.ts` (含可见性过滤)
- `server/src/utils/storageProvider.ts` (本地 fs 抽象)
- 单测: 可见性矩阵 4 档 × 4 角色 (owner/同部门/项目成员/admin) = 16 case

**阶段 6b — 前端列表 + 上传 (1 天)**
- `views/library/LibraryPage.vue` (网格 + 筛选条)
- `components/library/LibraryUploadDialog.vue` (拖拽 + 进度 + 元数据)
- `components/library/LibraryCard.vue` (缩略图卡)
- 接入 `/api/library` + `/api/library/tags` 自动补全

**阶段 6c — 预览 + 批量下载 (1 天)**
- `components/library/LibraryPreview.vue` (自研全屏预览)
- `server/src/routes/library.ts` 加 `POST /api/library/batch-download` (archiver 流式 zip)
- 前端批量操作 UI (全选跨页 + 批量下载/删除按钮)

**阶段 6d — 回收站 + admin 硬删 (0.5 天)**
- `views/library/RecycleBinPage.vue` (我的 + 管理员视角)
- 30 天定时清理 cron (`server/src/jobs/library-cleanup.ts`)
- 单测: 软删 → 恢复 → 30 天后硬删

**部署**: 复用 stage 1.5 的 deploy/rollback/probe 模板,改名 `deploy-stage6.sh`;probe 新增 4 个端点 401 + LibraryAsset 表存在 + mime 过滤。

---

## 10. 不在本轮范围 (与 r0-plan §9 不重叠,补充本阶段特定项)

| 项 | 原因 | 何时回看 |
|----|------|----------|
| 视频 / 文档 | 用户原话「资料库 (只图片)」 | 见 §7 范围边界 |
| AI 标签 / OCR | 依赖外部 API | P2: 多模态 API 稳定 |
| OSS 迁移 | 本轮本地够 | P1: 容量 > 10GB |
| 缩略图生成 | sharp native dep 复杂度 | P2: 大图加载反馈 ≥ 3 次 |
| 版本历史 | 容量翻倍 | P2: 合规要求 |

---

> **结束**。本文档可交付 zjzl-dev 全栈开发 + zjzl-test 验收。需 orchestrator 与用户对齐 §8 决策点 D-5.1 / D-5.3 / D-5.4 / D-5.7 / D-5.9 / D-5.13 共 6 个高影响项 (其余 8 个低风险可由 zjzl-dev 自行决定并写进 commit message)。