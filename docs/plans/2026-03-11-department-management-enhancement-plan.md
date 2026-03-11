# 部门与人员管理增强实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 增强部门与人员管理的数据关联展示，完善管理界面功能

**Architecture:** 在现有架构上增强，添加统计服务层和仪表盘 API，改造前端页面增加可视化组件

**Tech Stack:** TypeScript, Express.js, Prisma, Vue 3, Pinia, Tailwind CSS

---

## Phase 1: 后端 - 统计服务层

### Task 1: 创建统计服务

**Files:**
- Create: `server/src/services/statisticsService.ts`

**Step 1: 创建统计服务文件**

```typescript
/**
 * 中集智历 - 统计服务
 */
import prisma from '../config/database.js'

/**
 * 计算部门任务统计
 */
export async function calculateDepartmentTaskStats(departmentId: string) {
  // 获取部门下所有项目ID
  const projects = await prisma.project.findMany({
    where: { departmentId, deletedAt: null },
    select: { id: true }
  })
  const projectIds = projects.map(p => p.id)

  // 统计任务状态
  const tasks = await prisma.task.findMany({
    where: {
      projectId: { in: projectIds },
      deletedAt: null
    },
    select: { status: true, dueDate: true }
  })

  const now = new Date()
  const stats = {
    todo: 0,
    inProgress: 0,
    done: 0,
    cancelled: 0,
    overdue: 0
  }

  for (const task of tasks) {
    switch (task.status) {
      case 'TODO':
        stats.todo++
        if (task.dueDate && new Date(task.dueDate) < now) {
          stats.overdue++
        }
        break
      case 'IN_PROGRESS':
        stats.inProgress++
        break
      case 'DONE':
        stats.done++
        break
      case 'CANCELLED':
        stats.cancelled++
        break
    }
  }

  return stats
}

/**
 * 计算部门项目统计
 */
export async function calculateDepartmentProjectStats(departmentId: string) {
  const projects = await prisma.project.findMany({
    where: { departmentId, deletedAt: null },
    select: { id: true }
  })

  const projectIds = projects.map(p => p.id)
  const totalTasks = await prisma.task.count({
    where: { projectId: { in: projectIds }, deletedAt: null }
  })
  const doneTasks = await prisma.task.count({
    where: { projectId: { in: projectIds }, status: 'DONE', deletedAt: null }
  })

  return {
    active: projects.length,
    completed: 0, // 项目没有完成状态，暂时返回0
    progress: totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0
  }
}

/**
 * 计算成员工作负载
 */
export async function calculateMemberWorkload(userId: string) {
  const tasks = await prisma.task.findMany({
    where: {
      assigneeId: userId,
      deletedAt: null,
      isArchived: false
    },
    select: { status: true }
  })

  return {
    total: tasks.length,
    todo: tasks.filter(t => t.status === 'TODO').length,
    inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
    done: tasks.filter(t => t.status === 'DONE').length
  }
}

/**
 * 计算全局统计
 */
export async function calculateGlobalStats() {
  const [departments, users, projects, tasks] = await Promise.all([
    prisma.department.count(),
    prisma.user.count({ where: { isBanned: false } }),
    prisma.project.count({ where: { deletedAt: null } }),
    prisma.task.count({ where: { deletedAt: null } })
  ])

  const tasksByStatus = await prisma.task.groupBy({
    by: ['status'],
    where: { deletedAt: null },
    _count: true
  })

  const statusCounts = {
    todo: 0,
    inProgress: 0,
    done: 0,
    cancelled: 0
  }

  for (const item of tasksByStatus) {
    switch (item.status) {
      case 'TODO':
        statusCounts.todo = item._count
        break
      case 'IN_PROGRESS':
        statusCounts.inProgress = item._count
        break
      case 'DONE':
        statusCounts.done = item._count
        break
      case 'CANCELLED':
        statusCounts.cancelled = item._count
        break
    }
  }

  return {
    departments,
    users,
    projects,
    tasks,
    tasksByStatus: statusCounts
  }
}
```

**Step 2: 编译验证**

Run: `cd server && npm run build`
Expected: 编译成功，无错误

**Step 3: 提交**

```bash
git add server/src/services/statisticsService.ts
git commit -m "feat(server): add statistics service for department and global stats"
```

---

## Phase 2: 后端 - 部门仪表盘 API

### Task 2: 添加部门仪表盘控制器方法

**Files:**
- Modify: `server/src/controllers/departmentController.ts`

**Step 1: 添加导入和 getDashboard 方法**

在文件顶部添加导入：

```typescript
import * as statisticsService from '../services/statisticsService.js'
```

在文件末尾添加方法：

```typescript
/**
 * 获取部门仪表盘数据
 */
export async function getDepartmentDashboard(req: Request, res: Response) {
  const { id } = req.params
  const currentUserId = (req as AuthRequest).userId

  // 检查权限：系统管理员或本部门成员
  const currentUser = await prisma.user.findUnique({
    where: { id: currentUserId },
    select: { isAdmin: true, departmentId: true }
  })

  if (!currentUser?.isAdmin && currentUser?.departmentId !== id) {
    throw new ApiError(403, '无权查看此部门信息')
  }

  // 获取部门基本信息
  const department = await prisma.department.findUnique({
    where: { id },
    include: {
      admin: {
        select: { id: true, nickname: true, email: true, avatar: true }
      }
    }
  })

  if (!department) {
    throw new ApiError(404, '部门不存在')
  }

  // 获取统计数据
  const [taskStats, projectStats, members] = await Promise.all([
    statisticsService.calculateDepartmentTaskStats(id),
    statisticsService.calculateDepartmentProjectStats(id),
    prisma.user.findMany({
      where: { departmentId: id },
      select: {
        id: true,
        nickname: true,
        avatar: true
      }
    })
  ])

  // 获取成员工作负载
  const membersWithWorkload = await Promise.all(
    members.map(async (member) => ({
      ...member,
      workload: await statisticsService.calculateMemberWorkload(member.id)
    }))
  )

  // 获取部门项目
  const projects = await prisma.project.findMany({
    where: { departmentId: id, deletedAt: null },
    select: {
      id: true,
      name: true,
      _count: { select: { tasks: { where: { deletedAt: null } } } }
    },
    take: 10
  })

  // 计算项目进度
  const projectsWithProgress = await Promise.all(
    projects.map(async (project) => {
      const totalTasks = project._count.tasks
      const doneTasks = await prisma.task.count({
        where: { projectId: project.id, status: 'DONE', deletedAt: null }
      })
      return {
        id: project.id,
        name: project.name,
        taskCount: totalTasks,
        progress: totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0
      }
    })
  )

  // 获取最近任务
  const recentTasks = await prisma.task.findMany({
    where: {
      project: { departmentId: id },
      deletedAt: null
    },
    select: {
      id: true,
      title: true,
      status: true,
      dueDate: true,
      assignee: { select: { id: true, nickname: true } }
    },
    orderBy: { updatedAt: 'desc' },
    take: 10
  })

  // 活跃成员统计（本周有任务更新的）
  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
  const activeMembers = await prisma.task.count({
    where: {
      project: { departmentId: id },
      updatedAt: { gte: oneWeekAgo },
      deletedAt: null
    }
  })

  res.json({
    success: true,
    data: {
      department: {
        id: department.id,
        name: department.name,
        description: department.description,
        adminId: department.adminId
      },
      statistics: {
        tasks: taskStats,
        projects: {
          active: projectStats.active,
          completed: projectStats.completed
        },
        members: {
          total: members.length,
          activeThisWeek: activeMembers
        }
      },
      members: membersWithWorkload,
      projects: projectsWithProgress,
      recentTasks
    }
  })
}
```

**Step 2: 编译验证**

Run: `cd server && npm run build`
Expected: 编译成功

**Step 3: 提交**

```bash
git add server/src/controllers/departmentController.ts
git commit -m "feat(server): add department dashboard controller method"
```

---

### Task 3: 添加成员详情 API

**Files:**
- Modify: `server/src/controllers/departmentController.ts`

**Step 1: 添加 getMemberDetail 方法**

在文件末尾添加：

```typescript
/**
 * 获取部门成员详情（含日历）
 */
export async function getMemberDetail(req: Request, res: Response) {
  const { id: departmentId, userId } = req.params
  const currentUserId = (req as AuthRequest).userId

  // 检查权限
  const currentUser = await prisma.user.findUnique({
    where: { id: currentUserId },
    select: { isAdmin: true, departmentId: true }
  })

  if (!currentUser?.isAdmin && currentUser?.departmentId !== departmentId) {
    throw new ApiError(403, '无权查看此成员信息')
  }

  // 检查用户是否在该部门
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      nickname: true,
      email: true,
      avatar: true,
      departmentId: true
    }
  })

  if (!user || user.departmentId !== departmentId) {
    throw new ApiError(404, '成员不存在或不在此部门')
  }

  // 获取用户的所有任务
  const tasks = await prisma.task.findMany({
    where: {
      assigneeId: userId,
      deletedAt: null,
      isArchived: false
    },
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
      dueDate: true,
      project: { select: { id: true, name: true } }
    },
    orderBy: { dueDate: 'asc' }
  })

  // 构建日历数据（按日期分组）
  const calendarMap = new Map<string, { date: string; taskCount: number; tasks: typeof tasks }>()

  for (const task of tasks) {
    if (task.dueDate) {
      const dateStr = new Date(task.dueDate).toISOString().split('T')[0]
      const existing = calendarMap.get(dateStr)
      if (existing) {
        existing.taskCount++
        existing.tasks.push(task)
      } else {
        calendarMap.set(dateStr, { date: dateStr, taskCount: 1, tasks: [task] })
      }
    }
  }

  const calendar = Array.from(calendarMap.values()).sort((a, b) => a.date.localeCompare(b.date))

  res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        nickname: user.nickname,
        email: user.email,
        avatar: user.avatar
      },
      tasks,
      calendar
    }
  })
}
```

**Step 2: 编译验证**

Run: `cd server && npm run build`
Expected: 编译成功

**Step 3: 提交**

```bash
git add server/src/controllers/departmentController.ts
git commit -m "feat(server): add member detail with calendar API"
```

---

### Task 4: 添加部门路由

**Files:**
- Modify: `server/src/routes/departments.ts`

**Step 1: 添加新路由**

在现有路由后添加：

```typescript
/**
 * @route   GET /api/departments/:id/dashboard
 * @desc    获取部门仪表盘数据
 * @access  Private (Department Member)
 */
router.get('/:id/dashboard', auth, departmentController.getDepartmentDashboard)

/**
 * @route   GET /api/departments/:id/members/:userId
 * @desc    获取部门成员详情（含日历）
 * @access  Private (Department Member)
 */
router.get('/:id/members/:userId', auth, departmentController.getMemberDetail)
```

**Step 2: 编译验证**

Run: `cd server && npm run build`
Expected: 编译成功

**Step 3: 提交**

```bash
git add server/src/routes/departments.ts
git commit -m "feat(server): add department dashboard and member detail routes"
```

---

## Phase 3: 后端 - 系统管理仪表盘 API

### Task 5: 创建管理控制器

**Files:**
- Create: `server/src/controllers/adminController.ts`

**Step 1: 创建控制器文件**

```typescript
/**
 * 中集智历 - 管理控制器
 */
import { Request, Response } from 'express'
import prisma from '../config/database.js'
import { ApiError } from '../middlewares/errorHandler.js'
import { AuthRequest } from '../middlewares/auth.js'
import * as statisticsService from '../services/statisticsService.js'

/**
 * 获取系统管理仪表盘数据
 */
export async function getAdminDashboard(req: Request, res: Response) {
  const currentUserId = (req as AuthRequest).userId

  // 验证是否为系统管理员
  const user = await prisma.user.findUnique({
    where: { id: currentUserId },
    select: { isAdmin: true }
  })

  if (!user?.isAdmin) {
    throw new ApiError(403, '需要系统管理员权限')
  }

  // 获取全局统计
  const overview = await statisticsService.calculateGlobalStats()

  // 获取所有部门的统计
  const departments = await prisma.department.findMany({
    select: {
      id: true,
      name: true,
      _count: {
        select: { members: true, projects: true }
      }
    }
  })

  // 为每个部门计算任务统计
  const departmentsWithStats = await Promise.all(
    departments.map(async (dept) => {
      const taskStats = await statisticsService.calculateDepartmentTaskStats(dept.id)
      return {
        id: dept.id,
        name: dept.name,
        memberCount: dept._count.members,
        projectCount: dept._count.projects,
        taskStats: {
          todo: taskStats.todo,
          inProgress: taskStats.inProgress,
          done: taskStats.done
        }
      }
    })
  )

  res.json({
    success: true,
    data: {
      overview,
      departments: departmentsWithStats
    }
  })
}
```

**Step 2: 编译验证**

Run: `cd server && npm run build`
Expected: 编译成功

**Step 3: 提交**

```bash
git add server/src/controllers/adminController.ts
git commit -m "feat(server): add admin controller with dashboard endpoint"
```

---

### Task 6: 创建管理路由

**Files:**
- Create: `server/src/routes/admin.ts`

**Step 1: 创建路由文件**

```typescript
/**
 * 中集智历 - 管理路由
 */
import { Router } from 'express'
import * as adminController from '../controllers/adminController.js'
import { auth, requireAdmin } from '../middlewares/auth.js'

const router = Router()

/**
 * @route   GET /api/admin/dashboard
 * @desc    获取系统管理仪表盘数据
 * @access  Private (Admin)
 */
router.get('/dashboard', auth, requireAdmin, adminController.getAdminDashboard)

export default router
```

**Step 2: 注册路由到 app.ts**

在 `server/src/app.ts` 中添加路由导入和注册：

找到其他路由导入位置，添加：
```typescript
import adminRoutes from './routes/admin.js'
```

找到路由注册位置，添加：
```typescript
app.use('/api/admin', adminRoutes)
```

**Step 3: 编译验证**

Run: `cd server && npm run build`
Expected: 编译成功

**Step 4: 提交**

```bash
git add server/src/routes/admin.ts server/src/app.ts
git commit -m "feat(server): add admin routes with dashboard endpoint"
```

---

## Phase 4: 前端 - API 层

### Task 7: 创建仪表盘 API

**Files:**
- Create: `client/src/api/dashboard.ts`

**Step 1: 创建 API 文件**

```typescript
/**
 * 中集智历 - 仪表盘 API
 */
import { get } from '@/utils/request'
import type { User } from '@/types/user'

// 部门仪表盘数据类型
export interface DepartmentDashboard {
  department: {
    id: string
    name: string
    description?: string
    adminId: string
  }
  statistics: {
    tasks: {
      todo: number
      inProgress: number
      done: number
      cancelled: number
      overdue: number
    }
    projects: {
      active: number
      completed: number
    }
    members: {
      total: number
      activeThisWeek: number
    }
  }
  members: Array<User & {
    workload: {
      total: number
      todo: number
      inProgress: number
      done: number
    }
  }>
  projects: Array<{
    id: string
    name: string
    progress: number
    taskCount: number
  }>
  recentTasks: Array<{
    id: string
    title: string
    status: string
    dueDate: string
    assignee: {
      id: string
      nickname: string
    }
  }>
}

// 系统管理仪表盘数据类型
export interface AdminDashboard {
  overview: {
    departments: number
    users: number
    projects: number
    tasks: number
    tasksByStatus: {
      todo: number
      inProgress: number
      done: number
      cancelled: number
    }
  }
  departments: Array<{
    id: string
    name: string
    memberCount: number
    projectCount: number
    taskStats: {
      todo: number
      inProgress: number
      done: number
    }
  }>
}

// 成员详情数据类型
export interface MemberDetail {
  user: User
  tasks: Array<{
    id: string
    title: string
    status: string
    priority: string
    dueDate: string
    project: {
      id: string
      name: string
    }
  }>
  calendar: Array<{
    date: string
    taskCount: number
    tasks: Array<{
      id: string
      title: string
      status: string
      priority: string
      dueDate: string
    }>
  }>
}

/**
 * 获取部门仪表盘数据
 */
export async function getDepartmentDashboard(departmentId: string) {
  const response = await get<DepartmentDashboard>(`/departments/${departmentId}/dashboard`)
  return response.data
}

/**
 * 获取系统管理仪表盘数据
 */
export async function getAdminDashboard() {
  const response = await get<AdminDashboard>('/admin/dashboard')
  return response.data
}

/**
 * 获取成员详情
 */
export async function getMemberDetail(departmentId: string, userId: string) {
  const response = await get<MemberDetail>(`/departments/${departmentId}/members/${userId}`)
  return response.data
}
```

**Step 2: 验证编译**

Run: `cd client && npm run build`
Expected: 编译成功

**Step 3: 提交**

```bash
git add client/src/api/dashboard.ts
git commit -m "feat(client): add dashboard API types and methods"
```

---

## Phase 5: 前端 - 通用组件

### Task 8: 创建统计卡片组件

**Files:**
- Create: `client/src/components/StatisticsCard.vue`

**Step 1: 创建组件**

```vue
<template>
  <div class="bg-white rounded-lg border border-gray-200 p-4">
    <div class="flex items-center gap-3">
      <div
        class="w-10 h-10 rounded-lg flex items-center justify-center"
        :class="iconBgClass"
      >
        <component :is="icon" class="w-5 h-5" :class="iconClass" />
      </div>
      <div>
        <p class="text-2xl font-bold text-gray-900">{{ value }}</p>
        <p class="text-sm text-gray-500">{{ label }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, type Component } from 'vue'

const props = defineProps<{
  icon: Component
  value: number | string
  label: string
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple'
}>()

const colorMap = {
  blue: { bg: 'bg-blue-100', icon: 'text-blue-600' },
  green: { bg: 'bg-green-100', icon: 'text-green-600' },
  yellow: { bg: 'bg-yellow-100', icon: 'text-yellow-600' },
  red: { bg: 'bg-red-100', icon: 'text-red-600' },
  purple: { bg: 'bg-purple-100', icon: 'text-purple-600' }
}

const iconBgClass = computed(() => colorMap[props.color || 'blue'].bg)
const iconClass = computed(() => colorMap[props.color || 'blue'].icon)
</script>
```

**Step 2: 提交**

```bash
git add client/src/components/StatisticsCard.vue
git commit -m "feat(client): add StatisticsCard component"
```

---

### Task 9: 创建进度条组件

**Files:**
- Create: `client/src/components/ProgressBar.vue`

**Step 1: 创建组件**

```vue
<template>
  <div class="w-full">
    <div class="flex justify-between text-sm mb-1">
      <span class="text-gray-600">{{ label }}</span>
      <span class="text-gray-900 font-medium">{{ progress }}%</span>
    </div>
    <div class="w-full bg-gray-200 rounded-full h-2">
      <div
        class="h-2 rounded-full transition-all duration-300"
        :class="progressClass"
        :style="{ width: `${progress}%` }"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  label?: string
  progress: number
  color?: 'blue' | 'green' | 'yellow' | 'red'
}>()

const colorMap = {
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
  red: 'bg-red-500'
}

const progressClass = computed(() => {
  if (props.color) return colorMap[props.color]
  if (props.progress >= 80) return 'bg-green-500'
  if (props.progress >= 50) return 'bg-blue-500'
  if (props.progress >= 25) return 'bg-yellow-500'
  return 'bg-red-500'
})
</script>
```

**Step 2: 提交**

```bash
git add client/src/components/ProgressBar.vue
git commit -m "feat(client): add ProgressBar component"
```

---

## Phase 6: 前端 - 系统管理页面改造

### Task 10: 改造系统管理页面

**Files:**
- Modify: `client/src/views/admin/DepartmentManage.vue`

**Step 1: 添加统计卡片区域**

在 `<template>` 开头的 `<div class="space-y-6">` 内，页面标题之前添加：

```vue
    <!-- 全局统计卡片 -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatisticsCard
        :icon="Building2"
        :value="dashboard?.overview.departments || 0"
        label="部门"
        color="blue"
      />
      <StatisticsCard
        :icon="Users"
        :value="dashboard?.overview.users || 0"
        label="用户"
        color="green"
      />
      <StatisticsCard
        :icon="FolderKanban"
        :value="dashboard?.overview.projects || 0"
        label="项目"
        color="purple"
      />
      <StatisticsCard
        :icon="CheckCircle"
        :value="dashboard?.overview.tasks || 0"
        label="任务"
        color="yellow"
      />
    </div>
```

**Step 2: 添加导入和数据获取**

在 `<script setup>` 中添加：

```typescript
import StatisticsCard from '@/components/StatisticsCard.vue'
import ProgressBar from '@/components/ProgressBar.vue'
import { CheckCircle } from 'lucide-vue-next'
import { getAdminDashboard, type AdminDashboard } from '@/api/dashboard'

const dashboard = ref<AdminDashboard | null>(null)

// 在 onMounted 中获取仪表盘数据
onMounted(async () => {
  loading.value = true
  try {
    const [deptData, adminData] = await Promise.all([
      departmentStore.fetchDepartments(),
      getAdminDashboard().catch(() => null)
    ])
    dashboard.value = adminData
  } finally {
    loading.value = false
  }
})
```

**Step 3: 修改部门列表项添加进度**

将部门列表项改为：

```vue
        <div
          v-for="dept in dashboard?.departments || departments"
          :key="dept.id"
          class="p-4 hover:bg-gray-50"
        >
          <div class="flex items-center justify-between">
            <div class="flex-1">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Building2 class="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 class="font-medium text-gray-900">{{ dept.name }}</h3>
                </div>
              </div>
            </div>
            <div class="flex items-center gap-6 text-sm text-gray-500">
              <div class="flex items-center gap-1">
                <Users class="w-4 h-4" />
                <span>{{ dept.memberCount }} 人</span>
              </div>
              <div class="flex items-center gap-1">
                <FolderKanban class="w-4 h-4" />
                <span>{{ dept.projectCount }} 个项目</span>
              </div>
              <div class="w-32">
                <ProgressBar
                  :progress="Math.round((dept.taskStats.done / Math.max(dept.taskStats.todo + dept.taskStats.inProgress + dept.taskStats.done, 1)) * 100)"
                  label=""
                />
              </div>
            </div>
          </div>
        </div>
```

**Step 4: 验证编译**

Run: `cd client && npm run build`
Expected: 编译成功

**Step 5: 提交**

```bash
git add client/src/views/admin/DepartmentManage.vue
git commit -m "feat(client): enhance admin department page with statistics"
```

---

## Phase 7: 前端 - 部门仪表盘页面改造

### Task 11: 改造我的部门页面

**Files:**
- Modify: `client/src/views/department/MyDepartment.vue`

**Step 1: 添加统计卡片**

在部门信息卡片后，统计卡片之前添加任务统计：

```vue
      <!-- 任务统计卡片 -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatisticsCard
          :icon="ClipboardList"
          :value="dashboard?.statistics.tasks.todo || 0"
          label="待办"
          color="blue"
        />
        <StatisticsCard
          :icon="Loader2"
          :value="dashboard?.statistics.tasks.inProgress || 0"
          label="进行中"
          color="yellow"
        />
        <StatisticsCard
          :icon="CheckCircle"
          :value="dashboard?.statistics.tasks.done || 0"
          label="已完成"
          color="green"
        />
        <StatisticsCard
          :icon="AlertCircle"
          :value="dashboard?.statistics.tasks.overdue || 0"
          label="逾期"
          color="red"
        />
      </div>
```

**Step 2: 添加工作负载和项目进度区块**

在成员列表之前添加：

```vue
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- 成员工作负载 -->
        <div class="bg-white rounded-lg border border-gray-200">
          <div class="p-4 border-b border-gray-200">
            <h3 class="text-lg font-semibold text-gray-800">成员工作负载</h3>
          </div>
          <div class="p-4 space-y-3">
            <div
              v-for="member in dashboard?.members"
              :key="member.id"
              class="flex items-center gap-3"
            >
              <img
                :src="member.avatar || `https://api.dicebear.com/7.x/avataa/svg?seed=${member.nickname}`"
                class="w-8 h-8 rounded-full"
              />
              <div class="flex-1">
                <div class="flex justify-between text-sm mb-1">
                  <span class="text-gray-700">{{ member.nickname }}</span>
                  <span class="text-gray-500">{{ member.workload.total }} 个任务</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    class="bg-blue-500 h-1.5 rounded-full"
                    :style="{ width: `${Math.min(member.workload.total * 10, 100)}%` }"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 项目进度 -->
        <div class="bg-white rounded-lg border border-gray-200">
          <div class="p-4 border-b border-gray-200">
            <h3 class="text-lg font-semibold text-gray-800">项目进度</h3>
          </div>
          <div class="p-4 space-y-4">
            <div
              v-for="project in dashboard?.projects"
              :key="project.id"
            >
              <ProgressBar
                :label="project.name"
                :progress="project.progress"
              />
            </div>
            <p v-if="!dashboard?.projects?.length" class="text-gray-500 text-center py-4">
              暂无项目
            </p>
          </div>
        </div>
      </div>
```

**Step 3: 添加导入和数据获取逻辑**

更新 script 部分：

```typescript
import StatisticsCard from '@/components/StatisticsCard.vue'
import ProgressBar from '@/components/ProgressBar.vue'
import { ClipboardList, CheckCircle, AlertCircle } from 'lucide-vue-next'
import { getDepartmentDashboard, type DepartmentDashboard } from '@/api/dashboard'

const dashboard = ref<DepartmentDashboard | null>(null)

onMounted(async () => {
  try {
    await departmentStore.fetchMyDepartment()
    department.value = departmentStore.myDepartment
    if (department.value?.id) {
      dashboard.value = await getDepartmentDashboard(department.value.id)
    }
  } catch (e) {
    console.error('获取部门信息失败:', e)
  } finally {
    loading.value = false
  }
})
```

**Step 4: 验证编译**

Run: `cd client && npm run build`
Expected: 编译成功

**Step 5: 提交**

```bash
git add client/src/views/department/MyDepartment.vue
git commit -m "feat(client): enhance my department page with statistics and charts"
```

---

### Task 12: 创建成员日历页面

**Files:**
- Create: `client/src/views/department/MemberCalendar.vue`

**Step 1: 创建页面**

```vue
<template>
  <div class="space-y-6">
    <!-- 页面标题 -->
    <div class="flex items-center gap-4">
      <router-link
        to="/my-department"
        class="p-2 hover:bg-gray-100 rounded-lg"
      >
        <ArrowLeft class="w-5 h-5" />
      </router-link>
      <div>
        <h1 class="text-2xl font-bold text-gray-900">
          {{ memberDetail?.user.nickname }} 的任务日历
        </h1>
        <p class="text-gray-500 text-sm">{{ memberDetail?.user.email }}</p>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-12">
      <Loader2 class="w-8 h-8 animate-spin text-blue-600" />
    </div>

    <template v-else-if="memberDetail">
      <!-- 日历视图 -->
      <div class="bg-white rounded-lg border border-gray-200 p-6">
        <div class="flex justify-between items-center mb-4">
          <button @click="prevMonth" class="p-2 hover:bg-gray-100 rounded-lg">
            <ChevronLeft class="w-5 h-5" />
          </button>
          <h2 class="text-lg font-semibold">
            {{ currentYear }}年{{ currentMonth + 1 }}月
          </h2>
          <button @click="nextMonth" class="p-2 hover:bg-gray-100 rounded-lg">
            <ChevronRight class="w-5 h-5" />
          </button>
        </div>

        <!-- 星期标题 -->
        <div class="grid grid-cols-7 gap-1 mb-2">
          <div v-for="day in ['日', '一', '二', '三', '四', '五', '六']" :key="day" class="text-center text-sm text-gray-500 py-2">
            {{ day }}
          </div>
        </div>

        <!-- 日期格子 -->
        <div class="grid grid-cols-7 gap-1">
          <div
            v-for="(date, index) in calendarDates"
            :key="index"
            class="min-h-[80px] border border-gray-100 rounded p-1"
            :class="{ 'bg-gray-50': !date.isCurrentMonth }"
            @click="selectDate(date)"
          >
            <div
              class="text-sm"
              :class="{
                'text-gray-400': !date.isCurrentMonth,
                'text-blue-600 font-bold': date.isToday,
                'text-red-600': date.hasOverdue
              }"
            >
              {{ date.day }}
            </div>
            <div v-if="date.taskCount > 0" class="mt-1">
              <div
                class="text-xs px-1.5 py-0.5 rounded"
                :class="date.hasOverdue ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'"
              >
                {{ date.taskCount }}个任务
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 选中日期的任务列表 -->
      <div v-if="selectedDateTasks.length > 0" class="bg-white rounded-lg border border-gray-200">
        <div class="p-4 border-b border-gray-200">
          <h3 class="text-lg font-semibold">{{ selectedDate }} 的任务</h3>
        </div>
        <div class="divide-y divide-gray-200">
          <div
            v-for="task in selectedDateTasks"
            :key="task.id"
            class="p-4 hover:bg-gray-50"
          >
            <div class="flex items-center justify-between">
              <div>
                <p class="font-medium text-gray-900">{{ task.title }}</p>
                <p class="text-sm text-gray-500">{{ task.project?.name }}</p>
              </div>
              <span
                class="px-2 py-1 text-xs rounded-full"
                :class="getStatusClass(task.status)"
              >
                {{ getStatusText(task.status) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2 } from 'lucide-vue-next'
import { getMemberDetail, type MemberDetail } from '@/api/dashboard'

const route = useRoute()
const loading = ref(true)
const memberDetail = ref<MemberDetail | null>(null)

const currentYear = ref(new Date().getFullYear())
const currentMonth = ref(new Date().getMonth())
const selectedDate = ref('')

const departmentId = computed(() => route.params.id as string)
const userId = computed(() => route.params.userId as string)

// 获取日历日期数据
const calendarDates = computed(() => {
  const dates: Array<{
    day: number
    isCurrentMonth: boolean
    isToday: boolean
    taskCount: number
    hasOverdue: boolean
    fullDate: string
  }> = []

  const firstDay = new Date(currentYear.value, currentMonth.value, 1)
  const lastDay = new Date(currentYear.value, currentMonth.value + 1, 0)
  const startPadding = firstDay.getDay()

  // 上个月的填充
  const prevMonth = new Date(currentYear.value, currentMonth.value, 0)
  for (let i = startPadding - 1; i >= 0; i--) {
    const date = new Date(currentYear.value, currentMonth.value, -i)
    const dateStr = date.toISOString().split('T')[0]
    const calendarItem = memberDetail.value?.calendar.find(c => c.date === dateStr)
    dates.push({
      day: prevMonth.getDate() - i,
      isCurrentMonth: false,
      isToday: false,
      taskCount: calendarItem?.taskCount || 0,
      hasOverdue: calendarItem?.tasks.some(t => t.status !== 'DONE' && new Date(t.dueDate) < new Date()) || false,
      fullDate: dateStr
    })
  }

  // 当前月
  const today = new Date()
  for (let i = 1; i <= lastDay.getDate(); i++) {
    const date = new Date(currentYear.value, currentMonth.value, i)
    const dateStr = date.toISOString().split('T')[0]
    const calendarItem = memberDetail.value?.calendar.find(c => c.date === dateStr)
    dates.push({
      day: i,
      isCurrentMonth: true,
      isToday: date.toDateString() === today.toDateString(),
      taskCount: calendarItem?.taskCount || 0,
      hasOverdue: calendarItem?.tasks.some(t => t.status !== 'DONE' && new Date(t.dueDate) < new Date()) || false,
      fullDate: dateStr
    })
  }

  // 下个月的填充
  const remaining = 42 - dates.length
  for (let i = 1; i <= remaining; i++) {
    const date = new Date(currentYear.value, currentMonth.value + 1, i)
    const dateStr = date.toISOString().split('T')[0]
    const calendarItem = memberDetail.value?.calendar.find(c => c.date === dateStr)
    dates.push({
      day: i,
      isCurrentMonth: false,
      isToday: false,
      taskCount: calendarItem?.taskCount || 0,
      hasOverdue: calendarItem?.tasks.some(t => t.status !== 'DONE' && new Date(t.dueDate) < new Date()) || false,
      fullDate: dateStr
    })
  }

  return dates
})

// 选中日期的任务
const selectedDateTasks = computed(() => {
  if (!selectedDate.value || !memberDetail.value) return []
  const calendarItem = memberDetail.value.calendar.find(c => c.date === selectedDate.value)
  return calendarItem?.tasks || []
})

function prevMonth() {
  if (currentMonth.value === 0) {
    currentMonth.value = 11
    currentYear.value--
  } else {
    currentMonth.value--
  }
}

function nextMonth() {
  if (currentMonth.value === 11) {
    currentMonth.value = 0
    currentYear.value++
  } else {
    currentMonth.value++
  }
}

function selectDate(date: { fullDate: string; taskCount: number }) {
  if (date.taskCount > 0) {
    selectedDate.value = date.fullDate
  } else {
    selectedDate.value = ''
  }
}

function getStatusClass(status: string) {
  const classes: Record<string, string> = {
    TODO: 'bg-gray-100 text-gray-700',
    IN_PROGRESS: 'bg-blue-100 text-blue-700',
    DONE: 'bg-green-100 text-green-700',
    CANCELLED: 'bg-red-100 text-red-700'
  }
  return classes[status] || 'bg-gray-100 text-gray-700'
}

function getStatusText(status: string) {
  const texts: Record<string, string> = {
    TODO: '待办',
    IN_PROGRESS: '进行中',
    DONE: '已完成',
    CANCELLED: '已取消'
  }
  return texts[status] || status
}

onMounted(async () => {
  try {
    memberDetail.value = await getMemberDetail(departmentId.value, userId.value)
  } catch (e) {
    console.error('获取成员详情失败:', e)
  } finally {
    loading.value = false
  }
})
</script>
```

**Step 2: 提交**

```bash
git add client/src/views/department/MemberCalendar.vue
git commit -m "feat(client): add member calendar view page"
```

---

### Task 13: 添加成员日历路由

**Files:**
- Modify: `client/src/router/index.ts`

**Step 1: 添加路由**

在 `my-department` 路由后添加：

```typescript
      {
        path: 'my-department/members/:userId/calendar',
        name: 'MemberCalendar',
        component: () => import('@/views/department/MemberCalendar.vue'),
        meta: { title: '成员日历' }
      },
```

**Step 2: 验证编译**

Run: `cd client && npm run build`
Expected: 编译成功

**Step 3: 提交**

```bash
git add client/src/router/index.ts
git commit -m "feat(client): add member calendar route"
```

---

## Phase 8: 集成测试

### Task 14: 启动服务验证

**Step 1: 启动后端服务**

Run: `cd server && npm run dev`
Expected: 服务启动在 http://localhost:3000

**Step 2: 启动前端服务**

Run: `cd client && npm run dev`
Expected: 前端启动在 http://localhost:5173

**Step 3: 手动测试**

1. 以系统管理员登录，访问 `/admin/departments`，验证统计卡片显示
2. 以部门管理员登录，访问 `/my-department`，验证仪表盘数据
3. 点击成员，验证日历页面正常显示

**Step 4: 最终提交**

```bash
git add -A
git commit -m "feat: complete department management enhancement

- Add statistics service for department and global stats
- Add department dashboard and member detail APIs
- Add admin dashboard API
- Enhance admin department page with statistics cards
- Enhance my department page with workload and project progress
- Add member calendar view page"
```

---

## 验收清单

- [ ] 系统管理员可查看全局数据总览
- [ ] 系统管理员可在部门列表中看到任务进度
- [ ] 部门管理员可查看部门任务统计
- [ ] 部门管理员可查看成员工作负载
- [ ] 部门管理员可查看项目进度
- [ ] 普通用户可查看本部门仪表盘
- [ ] 普通用户可查看成员日历
- [ ] 所有 API 返回正确的数据结构
