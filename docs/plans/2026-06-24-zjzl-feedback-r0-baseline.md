# 阶段 0 + 阶段 0b 基线报告(2026-06-24)

## 0a 本地基线

### 装依赖
- `server`:成功,Prisma 客户端生成 OK
- `client`:成功

### 数据库迁移
- `prisma migrate dev`:**Already in sync**,无漂移
- 已有 4 次迁移:
  1. `20260301123832_init`
  2. `20260301231704_add_push_subscription`
  3. `20260520000000_add_departments_templates_visibility`
  4. `20260609000000_add_completion_evaluation_deliverable`

### 前端测试
- `pnpm test:run`:**3 个文件 / 48 个测试 / 全绿**
  - `src/utils/tagColor.test.ts`(14)
  - `src/utils/date.test.ts`(19)
  - `src/stores/auth.test.ts`(15)

### 后端测试
- `pnpm test`:**4 个套件编译失败 / 3 个套件通过**
  - 失败原因(均为基线 TS6133 严格模式,非本次需求):
    - `src/__tests__/task.test.ts:51` `let collaboratorToken`(声明未用)
    - `src/__tests__/task.test.ts:56` `let outsiderId`(声明未用)
    - `src/__tests__/export.test.ts:53` `const today`(声明未用)
  - 另有 EADDRINUSE :::3001 端口冲突(测试间未正确 teardown)
  - **不在本轮修复范围**,与本次反馈无关

## 0b 生产环境基线(阿里云 ECS 118.178.120.99)

- 域名:`zjzl.space`(DNS 指向 ECS) / 也支持 `zjzl.alaa.org.cn`
- Nginx 配置:`/etc/nginx/sites-enabled/zjzl.alaa.org.cn.conf`
- 后端路径:`/opt/zjzl-calendar/server/`(`node dist/app.js`,端口 3002)
- 前端路径:`/var/www/zjzl.space/`
- 数据库:**SQLite**(`/opt/zjzl-calendar/server/prisma/data.db`,与本地一致)
- `.env` 已读:`JWT_SECRET` 等凭据已配置、DeepSeek API 已配

### 生产 DB 现状(关键,影响阶段 1 设计)

**`User` 表(5 个 cimc.com 用户 + 1 个 admin@example.com)**
| id | email | nickname | isAdmin | departmentId |
|----|-------|----------|---------|--------------|
| cmolfwokl... | admin@example.com | 尹清正 | 1 | NULL |
| cmppfso34... | qingzheng.yin@cimc.com | 尹清正 | 1 | cmpe2lttt... |
| cmpph3ivq... | fengjiao.sun@cimc.com | 孙凤娇 | 0 | cmpe2lttt... |
| cmpph3iwu... | kai.chen@cimc.com | 陈楷 | 0 | cmpe2lttt... |
| cmpph3ixy... | jiaxin.liu@cimc.com | 刘佳欣 | 0 | cmpe2lttt... |
| cmpph3iyz... | wangtian@cimc.com | **王田** | 0 | cmpe2lttt... |

**`Department` 表(1 个)**
- `cmpe2lttt...` = 党群部,`adminId = cmppfso34...`(尹清正 `qingzheng.yin@cimc.com`)

**`ProjectMember` 表(5 个项目 × 4 个成员 = 20 行)**
- 5 个项目:党建工作 / 公益工作 / 共青团工作 / 工会工作 / 综合工作
- 4 个成员:刘佳欣 / 孙凤娇 / 尹清正(`admin@example.com`) / 陈楷
- ⚠️ **王田不在任何项目的成员表里** ← image4 下拉缺王田的根因

## 阶段 1 关键发现(影响实现方案)

| # | 发现 | 含义 |
|---|------|------|
| F1 | `User` 表**只有 `isAdmin: Boolean`**,**无 `role` 枚举、无 `isDeptAdmin` 字段** | 「尹清正」识别为部门管理员 = 看 `Department.adminId`,不需要扩 schema |
| F2 | 「尹清正」生产中有**两个账号**:超管 `admin@example.com`(无部门,在 5 个项目里)+ 部门管理员 `qingzheng.yin@cimc.com`(有部门,**没在任何项目里**) | 修复评价权限时,按 `Department.adminId` 反查即可,无需改 schema |
| F3 | `evaluationController.createEvaluation` 现有实现只允许 `isAdmin=true` | 阶段 1 改成:`isAdmin` OR `Department.adminId = userId` |
| F4 | `taskPermission.ts.TaskAction` 枚举**无 `EVALUATE`** | 新增 `EVALUATE` 即可复用中间件骨架 |
| F5 | `aiSummaryController` + `aiSummaryService` 已存在(weekly/monthly/quarterly/yearly 4 种维度) | 项目级「AI 总结」按钮**直接复用** `POST /api/dashboard/ai-summary` |
| F6 | **image4 下拉缺王田**的根因 = 王田**没在任何项目的 `ProjectMember` 表里** | 阶段 1 改前端下拉为「项目成员 + 同部门成员」,并补数据让王田进所有项目 |
| F7 | `Project` 已经有 `isArchived` / `visibility=PUBLIC` 等字段 | 阶段 1 不动项目可见性,保持 `PUBLIC` 默认 |

## 待用户拍板(已回采)
- ~~年度口径~~ → 自然年
- ~~批量录入~~ → Excel 模板后端生成
- ~~通知渠道~~ → 方案 A:消息中心(邮件留 P2)
- ~~尹主任角色~~ → 尹清正(部门管理员,通过 `Department.adminId` 识别)
- ~~王田问题~~ → 数据已存在,但不在项目成员表,需补数据 + 改下拉
