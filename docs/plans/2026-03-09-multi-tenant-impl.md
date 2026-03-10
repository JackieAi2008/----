# 多部门用户体系 - 实现计划

> 日期：2026-03-09
> 依赖设计文档：[2026-03-09-multi-tenant-design.md](./2026-03-09-multi-tenant-design.md)

## 实现阶段

采用**分阶段迭代**方式，每个阶段完成后可独立运行验证。

---

## 第一阶段：数据模型与基础 API（后端）

**目标**：建立部门数据模型，实现基础的 CRUD API

### 1.1 数据库迁移

**文件**：`server/prisma/schema.prisma`

```prisma
// 新增 Department 模型
model Department {
  id          String   @id @default(uuid())
  name        String   @unique
  description String?
  adminId     String   @unique  // 一对一：一个部门一个管理员
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  admin    User        @relation("DepartmentAdmin", fields: [adminId], references: [id])
  members  User[]      @relation("DepartmentMember")
  projects Project[]

  @@index([name])
}

// 修改 User 模型（新增字段）
model User {
  // ... 现有字段

  // 新增
  departmentId String?

  // 新增关联
  department        Department?  @relation("DepartmentMember", fields: [departmentId], references: [id])
  managedDepartment Department?  @relation("DepartmentAdmin")
}

// 修改 Project 模型（新增字段）
model Project {
  // ... 现有字段

  // 新增
  departmentId String?

  // 新增关联
  department Department? @relation(fields: [departmentId], references: [id])
}
```

**迁移命令**：
```bash
cd server
npx prisma migrate dev --name add_department_support
```

### 1.2 部门 API 路由

**新建文件**：`server/src/routes/departments.ts`

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/api/departments` | 系统管理员 | 获取所有部门列表 |
| GET | `/api/departments/:id` | 登录用户 | 获取部门详情（含成员列表） |
| POST | `/api/departments` | 系统管理员 | 创建部门 |
| PUT | `/api/departments/:id` | 系统管理员 | 更新部门信息 |
| DELETE | `/api/departments/:id` | 系统管理员 | 删除部门（需先迁移成员） |
| GET | `/api/departments/my` | 部门管理员 | 获取我管理的部门 |
| POST | `/api/departments/:id/members` | 部门管理员 | 添加部门成员 |
| DELETE | `/api/departments/:id/members/:userId` | 部门管理员 | 移除部门成员 |
| PUT | `/api/departments/:id/admin` | 系统管理员 | 更换部门管理员 |

### 1.3 用户 API 修改

**修改文件**：`server/src/routes/users.ts`

| 变更 | 说明 |
|------|------|
| GET `/api/users` | 系统管理员：返回所有用户及部门；部门管理员：返回本部门用户 |
| GET `/api/users/search` | 支持按部门筛选；跨部门搜索只返回基本信息 |
| 修改响应 | 用户信息包含 `departmentId` 和 `department` 字段 |

### 1.4 认证中间件增强

**修改文件**：`server/src/middlewares/auth.ts`

```typescript
export interface AuthRequest extends Request {
  userId?: string
  userRole?: string      // 'ADMIN' | 'DEPARTMENT_ADMIN' | 'MEMBER'
  departmentId?: string  // 用户所属部门
}

// 新增：部门管理员权限检查
export function requireDepartmentAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.userRole !== 'ADMIN' && req.userRole !== 'DEPARTMENT_ADMIN') {
    return res.status(403).json({ success: false, message: '需要部门管理员权限' })
  }
  next()
}

// 新增：检查是否属于同一部门或系统管理员
export function requireSameDepartmentOrAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  // 实现逻辑...
}
```

### 1.5 类型定义更新

**修改文件**：`server/src/types/user.ts`（如存在）

```typescript
export type UserRole = 'ADMIN' | 'DEPARTMENT_ADMIN' | 'MEMBER'

export interface UserResponse {
  id: string
  email: string
  nickname: string
  avatar?: string
  bio?: string
  isAdmin: boolean
  isDepartmentAdmin: boolean  // 新增
  departmentId?: string       // 新增
  department?: {              // 新增
    id: string
    name: string
  }
  createdAt: Date
}
```

---

## 第二阶段：权限系统改造（后端）

**目标**：改造现有路由，实现部门级别的权限控制

### 2.1 项目路由修改

**修改文件**：`server/src/routes/projects.ts`

| 变更点 | 说明 |
|--------|------|
| 创建项目 | 自动设置 `departmentId` 为创建者的部门 |
| 项目列表 | 普通成员：只显示本部门项目 + 被邀请的项目 |
| 项目详情 | 检查访问权限（本部门或被邀请） |
| 更新/删除 | 项目负责人 或 部门管理员 或 系统管理员 |
| 成员邀请 | 部门管理员可跨部门邀请 |

### 2.2 任务路由修改

**修改文件**：`server/src/routes/tasks.ts`

| 变更点 | 说明 |
|--------|------|
| 创建任务 | 检查是否有项目访问权限 |
| 任务列表 | 只返回有权限的项目中的任务 |
| 负责人分配 | 默认显示本部门成员；跨部门需有项目邀请关系 |

### 2.3 注册路由修改

**修改文件**：`server/src/routes/auth.ts`

```typescript
// 注册时增加部门选择
interface RegisterDTO {
  email: string
  password: string
  nickname: string
  departmentId?: string  // 新增：可选，申请加入的部门
  securityQuestion: number
  securityAnswer: string
}

// 注册后状态
// - 有部门：状态为 PENDING，等待部门管理员审核
// - 无部门：直接注册成功，提示联系管理员分配部门
```

### 2.4 权限中间件

**新建文件**：`server/src/middlewares/departmentPermission.ts`

```typescript
// 检查项目访问权限
export async function checkProjectAccess(userId: string, projectId: string): Promise<boolean>

// 检查是否为部门管理员（指定部门）
export async function isDepartmentAdmin(userId: string, departmentId: string): Promise<boolean>

// 检查用户是否属于指定部门
export async function isUserInDepartment(userId: string, departmentId: string): Promise<boolean>
```

---

## 第三阶段：前端实现

**目标**：实现部门管理界面，修改现有页面支持部门功能

### 3.1 类型定义更新

**修改文件**：`client/src/types/user.ts`

```typescript
export interface User {
  id: string
  email: string
  nickname: string
  avatar?: string
  bio?: string
  isAdmin: boolean
  isDepartmentAdmin: boolean  // 新增
  departmentId?: string       // 新增
  department?: Department     // 新增
  createdAt: string
}

export interface Department {
  id: string
  name: string
  description?: string
  adminId: string
  admin?: User
  memberCount?: number
  createdAt: string
}
```

**新建文件**：`client/src/types/department.ts`

### 3.2 API 模块

**新建文件**：`client/src/api/department.ts`

```typescript
export const getDepartments = () => request.get<Department[]>('/departments')
export const getDepartmentById = (id: string) => request.get<Department>(`/departments/${id}`)
export const createDepartment = (data: CreateDepartmentDTO) => request.post<Department>('/departments', data)
export const updateDepartment = (id: string, data: UpdateDepartmentDTO) => request.put<Department>(`/departments/${id}`, data)
export const deleteDepartment = (id: string) => request.delete(`/departments/${id}`)
export const addDepartmentMember = (departmentId: string, userId: string) => request.post(`/departments/${departmentId}/members`, { userId })
export const removeDepartmentMember = (departmentId: string, userId: string) => request.delete(`/departments/${departmentId}/members/${userId}`)
export const getMyDepartment = () => request.get<Department>('/departments/my')
```

### 3.3 Store 模块

**新建文件**：`client/src/stores/department.ts`

```typescript
export const useDepartmentStore = defineStore('department', () => {
  const departments = ref<Department[]>([])
  const myDepartment = ref<Department | null>(null)

  // 系统管理员：获取所有部门
  async function fetchDepartments() { ... }

  // 获取我管理的部门（部门管理员）
  async function fetchMyDepartment() { ... }

  // 创建部门
  async function createDepartment(data: CreateDepartmentDTO) { ... }

  // 添加成员
  async function addMember(userId: string) { ... }

  // 移除成员
  async function removeMember(userId: string) { ... }

  return { departments, myDepartment, ... }
})
```

### 3.4 新增页面

**新建文件**：`client/src/views/admin/DepartmentManage.vue`

功能：
- 部门列表展示（名称、描述、管理员、成员数）
- 创建/编辑/删除部门
- 指定/更换部门管理员

**新建文件**：`client/src/views/department/MyDepartment.vue`

功能：
- 本部门成员列表
- 添加/移除成员
- 本部门项目统计

### 3.5 修改现有页面

#### 注册页面
**文件**：`client/src/views/auth/Register.vue`

- 添加部门选择下拉框
- 显示注册审核提示

#### 项目列表页
**文件**：`client/src/views/project/ProjectList.vue`

- 显示项目所属部门标签
- 筛选器增加部门选项（系统管理员可见）

#### 项目详情页
**文件**：`client/src/views/project/ProjectDetail.vue`

- 显示项目所属部门
- 成员管理支持跨部门邀请
- 显示成员所属部门

#### 任务表单
**文件**：`client/src/components/task/TaskForm.vue`

- 负责人选择：默认本部门成员
- 增加搜索其他部门成员功能

#### 导航栏
**文件**：`client/src/layouts/MainLayout.vue`

- 显示当前用户所属部门
- 部门管理员显示「部门管理」入口
- 系统管理员显示「系统管理」入口

### 3.6 路由配置

**修改文件**：`client/src/router/index.ts`

```typescript
// 新增路由
{
  path: '/admin/departments',
  component: () => import('@/views/admin/DepartmentManage.vue'),
  meta: { requiresAdmin: true }
},
{
  path: '/my-department',
  component: () => import('@/views/department/MyDepartment.vue'),
  meta: { requiresDepartmentAdmin: true }
}
```

### 3.7 导航守卫更新

**修改文件**：`client/src/router/index.ts`

```typescript
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()

  if (to.meta.requiresAdmin && !authStore.isAdmin) {
    return next('/dashboard')
  }

  if (to.meta.requiresDepartmentAdmin && !authStore.isDepartmentAdmin && !authStore.isAdmin) {
    return next('/dashboard')
  }

  next()
})
```

---

## 第四阶段：数据迁移与测试

**目标**：平滑迁移现有数据，确保功能正常

### 4.1 数据迁移脚本

**新建文件**：`server/scripts/migrate-to-department.ts`

```typescript
// 迁移步骤
async function migrate() {
  // 1. 创建默认部门（可选）
  const defaultDept = await prisma.department.create({
    data: { name: '默认部门', description: '迁移时自动创建', adminId: firstAdminId }
  })

  // 2. 将所有用户分配到默认部门
  await prisma.user.updateMany({
    data: { departmentId: defaultDept.id }
  })

  // 3. 将所有项目分配到默认部门
  await prisma.project.updateMany({
    data: { departmentId: defaultDept.id }
  })
}
```

### 4.2 测试计划

#### 单元测试
- [ ] 部门 CRUD API 测试
- [ ] 权限中间件测试
- [ ] 部门成员管理测试

#### 集成测试
- [ ] 跨部门邀请流程测试
- [ ] 项目访问权限测试
- [ ] 任务创建权限测试

#### E2E 测试
- [ ] 系统管理员创建部门流程
- [ ] 部门管理员管理成员流程
- [ ] 跨部门协作流程

---

## 实现优先级

| 优先级 | 阶段 | 内容 | 预估工作量 |
|--------|------|------|------------|
| P0 | 1.1 | 数据库迁移 | 0.5h |
| P0 | 1.2 | 部门 CRUD API | 2h |
| P0 | 1.4 | 认证中间件增强 | 1h |
| P1 | 2.1 | 项目路由修改 | 2h |
| P1 | 2.2 | 任务路由修改 | 1h |
| P1 | 3.1-3.3 | 前端类型/API/Store | 1h |
| P1 | 3.4 | 新增页面（部门管理） | 3h |
| P2 | 3.5 | 修改现有页面 | 4h |
| P2 | 2.3 | 注册路由修改 | 1h |
| P3 | 4.1 | 数据迁移脚本 | 1h |
| P3 | 4.2 | 测试 | 2h |

**总预估**：约 18-20 小时

---

## 文件变更清单

### 后端新增文件
- `server/src/routes/departments.ts`
- `server/src/middlewares/departmentPermission.ts`
- `server/scripts/migrate-to-department.ts`
- `server/src/types/department.ts`（如需要）

### 后端修改文件
- `server/prisma/schema.prisma`
- `server/src/routes/auth.ts`
- `server/src/routes/users.ts`
- `server/src/routes/projects.ts`
- `server/src/routes/tasks.ts`
- `server/src/middlewares/auth.ts`
- `server/src/app.ts`（注册新路由）

### 前端新增文件
- `client/src/views/admin/DepartmentManage.vue`
- `client/src/views/department/MyDepartment.vue`
- `client/src/api/department.ts`
- `client/src/stores/department.ts`
- `client/src/types/department.ts`

### 前端修改文件
- `client/src/types/user.ts`
- `client/src/views/auth/Register.vue`
- `client/src/views/project/ProjectList.vue`
- `client/src/views/project/ProjectDetail.vue`
- `client/src/components/task/TaskForm.vue`
- `client/src/layouts/MainLayout.vue`
- `client/src/router/index.ts`
- `client/src/stores/auth.ts`

---

## 风险与注意事项

1. **数据迁移风险**
   - 迁移前备份数据库
   - 部门字段设为可空，保证兼容性
   - 提供回滚脚本

2. **权限边界**
   - 跨部门邀请需严格控制
   - 被邀请者权限仅限特定项目
   - 系统管理员权限不应被稀释

3. **用户体验**
   - 未分配部门的用户需有明确提示
   - 部门切换需考虑项目可见性变化
   - 邀请通知需说明项目所属部门

4. **性能考虑**
   - 项目列表查询需优化（部门过滤 + 邀请项目）
   - 用户搜索跨部门时限制返回字段
