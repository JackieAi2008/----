# 多部门用户体系实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 完成多部门用户体系的剩余功能实现，包括项目列表部门标签、跨部门邀请、用户部门显示等。

**Architecture:** 基于已有的 Department 模型和 API，增强前端组件以支持部门隔离和跨部门协作功能。

**Tech Stack:** Vue 3 + TypeScript, Pinia, Tailwind CSS, Express.js, Prisma, SQLite

---

## 实现状态分析

### ✅ 已完成

| 功能 | 文件位置 |
|------|----------|
| 数据库模型 | `server/prisma/schema.prisma` - Department, User.departmentId, Project.departmentId |
| 部门 API | `server/src/routes/departments.ts`, `server/src/controllers/departmentController.ts` |
| 项目部门过滤 | `server/src/controllers/projectController.ts` - getProjects() |
| 部门管理页面 | `client/src/views/admin/DepartmentManage.vue` |
| 我的部门页面 | `client/src/views/department/MyDepartment.vue` |
| 注册部门选择 | `client/src/views/auth/Register.vue` |
| 导航菜单权限 | `client/src/layouts/MainLayout.vue` |

### ❌ 待实现

| 功能 | 优先级 | 说明 |
|------|--------|------|
| 项目列表部门标签 | P0 | 项目卡片显示所属部门 |
| 用户信息部门显示 | P0 | 导航栏、任务列表等显示用户部门 |
| 跨部门邀请功能 | P1 | 项目详情页邀请其他部门成员 |
| 任务表单跨部门搜索 | P2 | 负责人选择支持搜索其他部门 |

---

## Task 1: 项目列表显示部门标签

**Files:**
- Modify: `client/src/views/project/ProjectList.vue:57-63`

**Step 1: 添加部门标签显示**

在项目卡片的封面区域，可见性标签旁边添加部门标签：

```vue
<!-- 在可见性标签后面添加 -->
<span
  v-if="project.department"
  class="absolute top-3 right-16 px-2.5 py-1 text-xs rounded-lg font-medium bg-blue-500/90 text-white"
>
  {{ project.department.name }}
</span>
```

**Step 2: 验证效果**

运行开发服务器，检查项目列表页面是否正确显示部门标签。

**Step 3: Commit**

```bash
git add client/src/views/project/ProjectList.vue
git commit -m "feat(project): add department label to project cards"
```

---

## Task 2: 导航栏显示用户部门

**Files:**
- Modify: `client/src/layouts/MainLayout.vue:96-105`

**Step 1: 修改用户信息区域**

将用户信息区域修改为显示部门：

```vue
<div class="flex-1 min-w-0">
  <p class="text-sm font-medium text-white truncate">
    {{ authStore.user?.nickname || '用户' }}
  </p>
  <p class="text-xs text-blue-200/70 truncate">
    {{ authStore.user?.department?.name || '未分配部门' }}
    <span v-if="authStore.isAdmin" class="text-yellow-300">(管理员)</span>
    <span v-else-if="authStore.isDepartmentAdmin" class="text-green-300">(部门管理员)</span>
  </p>
</div>
```

**Step 2: 更新 User 类型定义**

检查 `client/src/types/user.ts`，确保 User 类型包含 department 字段：

```typescript
export interface User {
  // ... 现有字段
  department?: {
    id: string
    name: string
  }
  managedDepartment?: {
    id: string
    name: string
  }
}
```

**Step 3: 更新 auth store**

检查 `client/src/stores/auth.ts`，确保登录时获取部门信息：

```typescript
// 在 fetchUser 或 login 响应处理中
// 确保后端返回 user.department 信息
```

**Step 4: Commit**

```bash
git add client/src/layouts/MainLayout.vue client/src/types/user.ts
git commit -m "feat(layout): show user department in sidebar"
```

---

## Task 3: 后端 API 支持跨部门用户搜索

**Files:**
- Create: `server/src/controllers/userController.ts` (如果不存在则修改)
- Modify: `server/src/routes/users.ts`

**Step 1: 添加跨部门用户搜索接口**

在 `server/src/routes/users.ts` 添加：

```typescript
/**
 * @route   GET /api/users/search
 * @desc    搜索用户（用于跨部门邀请）
 * @access  Private
 */
router.get('/search', auth, userController.searchUsers)
```

**Step 2: 实现搜索控制器**

在 `server/src/controllers/userController.ts` 添加：

```typescript
/**
 * 搜索用户（用于跨部门邀请）
 * 只返回基本信息：id, nickname, department
 */
export async function searchUsers(req: Request, res: Response) {
  const userId = (req as AuthRequest).userId
  const { keyword, projectId } = req.query

  if (!keyword || typeof keyword !== 'string' || keyword.length < 2) {
    throw new ApiError(400, '搜索关键词至少2个字符')
  }

  // 获取当前用户信息
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true, departmentId: true }
  })

  // 构建搜索条件
  const whereClause: any = {
    isBanned: false,
    OR: [
      { nickname: { contains: keyword } },
      { email: { contains: keyword } }
    ]
  }

  // 如果不是系统管理员，排除自己部门的人（他们可以直接看到）
  if (!currentUser?.isAdmin && currentUser?.departmentId) {
    whereClause.departmentId = { not: currentUser.departmentId }
  }

  // 如果指定了项目ID，排除已经是项目成员的人
  if (projectId && typeof projectId === 'string') {
    whereClause.NOT = {
      projectMembers: {
        some: { projectId }
      }
    }
  }

  const users = await prisma.user.findMany({
    where: whereClause,
    select: {
      id: true,
      nickname: true,
      email: true,
      avatar: true,
      department: {
        select: { id: true, name: true }
      }
    },
    take: 20
  })

  res.json({
    success: true,
    data: users
  })
}
```

**Step 3: Commit**

```bash
git add server/src/routes/users.ts server/src/controllers/userController.ts
git commit -m "feat(api): add cross-department user search endpoint"
```

---

## Task 4: 项目详情页跨部门邀请

**Files:**
- Modify: `client/src/views/project/ProjectDetail.vue`
- Modify: `client/src/api/project.ts` (如需要)

**Step 1: 添加跨部门邀请搜索组件**

在项目成员管理区域添加跨部门邀请功能：

```vue
<!-- 在成员列表后添加 -->
<div class="mt-4">
  <h4 class="text-sm font-medium text-gray-700 mb-2">邀请其他部门成员</h4>
  <div class="relative">
    <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
    <input
      v-model="crossDeptSearchKeyword"
      type="text"
      class="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
      placeholder="搜索其他部门成员（输入姓名或邮箱）"
      @input="handleCrossDeptSearch"
    />
  </div>
  <!-- 搜索结果 -->
  <div v-if="crossDeptSearchResults.length > 0" class="mt-2 border rounded-lg max-h-48 overflow-y-auto">
    <div
      v-for="user in crossDeptSearchResults"
      :key="user.id"
      class="p-3 flex items-center justify-between hover:bg-gray-50"
    >
      <div class="flex items-center gap-3">
        <img
          :src="user.avatar || `https://api.dicebear.com/7.x/avataa/svg?seed=${user.nickname}`"
          class="w-8 h-8 rounded-full"
        />
        <div>
          <p class="text-sm font-medium">{{ user.nickname }}</p>
          <p class="text-xs text-gray-500">{{ user.department?.name || '未分配部门' }}</p>
        </div>
      </div>
      <button
        @click="handleCrossDeptInvite(user.id)"
        class="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        邀请
      </button>
    </div>
  </div>
</div>
```

**Step 2: 添加搜索逻辑**

```typescript
const crossDeptSearchKeyword = ref('')
const crossDeptSearchResults = ref<User[]>([])
let searchTimeout: number | null = null

async function handleCrossDeptSearch() {
  if (searchTimeout) clearTimeout(searchTimeout)

  if (crossDeptSearchKeyword.value.length < 2) {
    crossDeptSearchResults.value = []
    return
  }

  searchTimeout = window.setTimeout(async () => {
    try {
      const response = await get<User[]>(`/users/search?keyword=${encodeURIComponent(crossDeptSearchKeyword.value)}&projectId=${projectId}`)
      crossDeptSearchResults.value = response.data || []
    } catch (e) {
      console.error('搜索用户失败:', e)
    }
  }, 300)
}

async function handleCrossDeptInvite(userId: string) {
  try {
    await post(`/projects/${projectId}/invites`, { inviteeId: userId })
    toast.success('邀请已发送', '等待对方接受')
    crossDeptSearchKeyword.value = ''
    crossDeptSearchResults.value = []
  } catch (e) {
    toast.error('邀请失败', e instanceof Error ? e.message : '未知错误')
  }
}
```

**Step 3: 权限控制**

只有项目负责人和部门管理员可以发起跨部门邀请：

```vue
<div v-if="canInviteCrossDept" class="mt-4">
  <!-- 跨部门邀请组件 -->
</div>
```

```typescript
const canInviteCrossDept = computed(() => {
  return authStore.isAdmin ||
         authStore.isDepartmentAdmin ||
         project.value?.ownerId === authStore.user?.id
})
```

**Step 4: Commit**

```bash
git add client/src/views/project/ProjectDetail.vue
git commit -m "feat(project): add cross-department member invite"
```

---

## Task 5: 任务表单支持跨部门负责人选择

**Files:**
- Modify: `client/src/components/task/TaskForm.vue`

**Step 1: 修改负责人选择为可搜索模式**

将负责人下拉框改为支持搜索的组件：

```vue
<!-- 负责人 -->
<div>
  <label class="block text-sm font-medium text-gray-700 mb-1">
    负责人 <span class="text-red-500">*</span>
  </label>
  <!-- 当前部门成员 -->
  <select v-model="form.assigneeId" class="input" required>
    <option value="">请选择负责人</option>
    <optgroup label="本部门成员">
      <option v-for="member in members" :key="member.userId" :value="member.userId">
        {{ member.user?.nickname || '未知用户' }}
      </option>
    </optgroup>
  </select>

  <!-- 跨部门搜索（仅项目负责人可见） -->
  <div v-if="canSearchCrossDept" class="mt-2">
    <details class="group">
      <summary class="text-sm text-blue-600 cursor-pointer hover:text-blue-700">
        搜索其他部门成员
      </summary>
      <div class="mt-2">
        <input
          v-model="assigneeSearchKeyword"
          type="text"
          class="input text-sm"
          placeholder="输入姓名或邮箱搜索"
          @input="handleAssigneeSearch"
        />
        <div v-if="assigneeSearchResults.length > 0" class="mt-2 border rounded-lg max-h-32 overflow-y-auto">
          <div
            v-for="user in assigneeSearchResults"
            :key="user.id"
            class="p-2 flex items-center justify-between hover:bg-gray-50 cursor-pointer"
            @click="selectCrossDeptAssignee(user)"
          >
            <div class="flex items-center gap-2">
              <img
                :src="user.avatar || `https://api.dicebear.com/7.x/avataa/svg?seed=${user.nickname}`"
                class="w-6 h-6 rounded-full"
              />
              <div>
                <p class="text-xs font-medium">{{ user.nickname }}</p>
                <p class="text-xs text-gray-400">{{ user.department?.name }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </details>
  </div>
</div>
```

**Step 2: 添加搜索逻辑**

```typescript
const assigneeSearchKeyword = ref('')
const assigneeSearchResults = ref<User[]>([])

const canSearchCrossDept = computed(() => {
  // 只有项目负责人可以跨部门分配任务
  return props.project?.ownerId === authStore.user?.id || authStore.isAdmin
})

function selectCrossDeptAssignee(user: User) {
  form.value.assigneeId = user.id
  assigneeSearchKeyword.value = ''
  assigneeSearchResults.value = []
}

async function handleAssigneeSearch() {
  if (assigneeSearchKeyword.value.length < 2) {
    assigneeSearchResults.value = []
    return
  }

  try {
    const response = await get<User[]>(`/users/search?keyword=${encodeURIComponent(assigneeSearchKeyword.value)}`)
    assigneeSearchResults.value = response.data || []
  } catch (e) {
    console.error('搜索用户失败:', e)
  }
}
```

**Step 3: Commit**

```bash
git add client/src/components/task/TaskForm.vue
git commit -m "feat(task): add cross-department assignee search"
```

---

## Task 6: 任务列表显示负责人部门

**Files:**
- Modify: `client/src/views/project/ProjectDetail.vue` (任务列表部分)

**Step 1: 修改任务列表显示**

在任务负责人显示处添加部门标签：

```vue
<div class="flex items-center gap-2">
  <img
    :src="task.assignee?.avatar || `https://api.dicebear.com/7.x/avataa/svg?seed=${task.assignee?.nickname}`"
    class="w-6 h-6 rounded-full"
  />
  <span class="text-sm">{{ task.assignee?.nickname }}</span>
  <span v-if="task.assignee?.department" class="text-xs text-gray-400">
    [{{ task.assignee.department.name }}]
  </span>
</div>
```

**Step 2: 确保后端返回部门信息**

检查 `server/src/controllers/taskController.ts`，确保任务查询包含 assignee.department：

```typescript
include: {
  assignee: {
    select: {
      id: true,
      nickname: true,
      avatar: true,
      department: {
        select: { id: true, name: true }
      }
    }
  }
}
```

**Step 3: Commit**

```bash
git add client/src/views/project/ProjectDetail.vue server/src/controllers/taskController.ts
git commit -m "feat(task): show assignee department in task list"
```

---

## Task 7: 日历页面显示用户部门

**Files:**
- Modify: `client/src/views/calendar/CalendarPage.vue`

**Step 1: 在日历任务卡片中显示部门**

```vue
<div class="flex items-center gap-1 text-xs text-gray-500">
  <span>{{ task.assignee?.nickname }}</span>
  <span v-if="task.assignee?.department" class="text-gray-400">
    [{{ task.assignee.department.name }}]
  </span>
</div>
```

**Step 2: Commit**

```bash
git add client/src/views/calendar/CalendarPage.vue
git commit -m "feat(calendar): show assignee department"
```

---

## Task 8: 集成测试和修复

**Step 1: 运行完整构建**

```bash
cd client && npm run build
cd ../server && npm run build
```

**Step 2: 功能测试清单**

- [ ] 项目列表显示部门标签
- [ ] 导航栏显示用户部门
- [ ] 项目详情页可以搜索其他部门成员
- [ ] 项目详情页可以邀请其他部门成员
- [ ] 任务表单可以搜索其他部门负责人
- [ ] 任务列表显示负责人部门
- [ ] 日历页面显示负责人部门

**Step 3: 修复发现的问题**

根据测试结果修复问题。

**Step 4: Final Commit**

```bash
git add .
git commit -m "feat: complete multi-tenant department system"
```

---

## 执行顺序总结

| 任务 | 优先级 | 预估时间 |
|------|--------|----------|
| Task 1: 项目列表部门标签 | P0 | 10分钟 |
| Task 2: 导航栏用户部门 | P0 | 15分钟 |
| Task 3: 跨部门搜索API | P1 | 20分钟 |
| Task 4: 项目跨部门邀请 | P1 | 30分钟 |
| Task 5: 任务跨部门负责人 | P2 | 25分钟 |
| Task 6: 任务列表部门显示 | P1 | 15分钟 |
| Task 7: 日历部门显示 | P2 | 10分钟 |
| Task 8: 集成测试 | P0 | 20分钟 |

**总预估时间：约2.5小时**
