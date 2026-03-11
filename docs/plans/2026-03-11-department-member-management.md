# 部门成员管理功能实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在部门管理页面内实现完整的成员管理功能，包括查看成员列表、添加成员、移除成员、更换管理员。

**Architecture:** 采用左右分栏布局，左侧为部门列表，右侧为选中部门的详情面板（含成员表格）。后端已有基础 API，需要扩展支持批量添加、任务转移等功能。

**Tech Stack:** Vue 3 + TypeScript + Pinia (前端), Express + Prisma + SQLite (后端)

---

## Task 1: 扩展后端 API - 支持批量添加成员

**Files:**
- Modify: `server/src/controllers/departmentController.ts:322-372`
- Modify: `server/src/routes/departments.ts:74-78`

**Step 1: 修改 addMember 控制器支持批量添加**

在 `server/src/controllers/departmentController.ts` 中，将 `addMember` 函数修改为支持批量添加，并允许从其他部门移入：

```typescript
/**
 * 添加部门成员（部门管理员/系统管理员）
 * 支持批量添加，支持从其他部门移入
 */
export async function addMember(req: Request, res: Response) {
  const { id } = req.params
  const { userIds, userId } = req.body // 支持批量 (userIds) 和单个 (userId)
  const currentUserId = (req as AuthRequest).userId

  const department = await prisma.department.findUnique({
    where: { id }
  })

  if (!department) {
    throw new ApiError(404, '部门不存在')
  }

  // 检查权限：系统管理员或本部门管理员
  const currentUser = await prisma.user.findUnique({
    where: { id: currentUserId },
    select: { isAdmin: true }
  })

  if (!currentUser?.isAdmin && department.adminId !== currentUserId) {
    throw new ApiError(403, '无权管理此部门')
  }

  // 统一处理为 userIds 数组
  const targetUserIds = userIds || (userId ? [userId] : [])

  if (targetUserIds.length === 0) {
    throw new ApiError(400, '请选择要添加的成员')
  }

  // 检查用户是否存在
  const users = await prisma.user.findMany({
    where: { id: { in: targetUserIds } }
  })

  if (users.length !== targetUserIds.length) {
    throw new ApiError(400, '部分用户不存在')
  }

  // 检查是否有部门管理员被移入
  const adminIds = await prisma.department.findMany({
    where: { adminId: { in: targetUserIds } },
    select: { adminId: true }
  })

  if (adminIds.length > 0) {
    throw new ApiError(400, '不能添加其他部门的管理员，请先更换其部门管理员')
  }

  // 批量添加成员（包括从其他部门移入的）
  await prisma.user.updateMany({
    where: { id: { in: targetUserIds } },
    data: { departmentId: id }
  })

  res.json({
    success: true,
    message: `成功添加 ${targetUserIds.length} 名成员`
  })
}
```

**Step 2: 验证修改**

启动服务器测试 API：
```bash
cd server && npm run dev
```

**Step 3: Commit**

```bash
git add server/src/controllers/departmentController.ts
git commit -m "feat(server): support batch add department members"
```

---

## Task 2: 扩展后端 API - 移除成员时支持任务转移

**Files:**
- Modify: `server/src/controllers/departmentController.ts:377-423`

**Step 1: 修改 removeMember 控制器支持任务转移**

```typescript
/**
 * 移除部门成员（部门管理员/系统管理员）
 * 支持将任务转移给其他成员
 */
export async function removeMember(req: Request, res: Response) {
  const { id, userId } = req.params
  const { transferToUserId } = req.body // 可选：任务接收人
  const currentUserId = (req as AuthRequest).userId

  const department = await prisma.department.findUnique({
    where: { id }
  })

  if (!department) {
    throw new ApiError(404, '部门不存在')
  }

  // 检查权限
  const currentUser = await prisma.user.findUnique({
    where: { id: currentUserId },
    select: { isAdmin: true }
  })

  if (!currentUser?.isAdmin && department.adminId !== currentUserId) {
    throw new ApiError(403, '无权管理此部门')
  }

  // 不能移除部门管理员
  if (userId === department.adminId) {
    throw new ApiError(400, '不能移除部门管理员，请先更换管理员')
  }

  // 检查用户是否在本部门
  const user = await prisma.user.findUnique({
    where: { id: userId }
  })

  if (!user || user.departmentId !== id) {
    throw new ApiError(400, '该用户不在本部门')
  }

  // 如果指定了任务接收人，转移任务
  if (transferToUserId) {
    const transferToUser = await prisma.user.findUnique({
      where: { id: transferToUserId }
    })

    if (!transferToUser || transferToUser.departmentId !== id) {
      throw new ApiError(400, '任务接收人必须在本部门中')
    }

    await prisma.task.updateMany({
      where: { assigneeId: userId },
      data: { assigneeId: transferToUserId }
    })
  }

  // 移除成员
  await prisma.user.update({
    where: { id: userId },
    data: { departmentId: null }
  })

  res.json({
    success: true,
    message: '成员已移除'
  })
}
```

**Step 2: Commit**

```bash
git add server/src/controllers/departmentController.ts
git commit -m "feat(server): support task transfer when removing member"
```

---

## Task 3: 添加后端 API - 获取未分配部门的用户

**Files:**
- Modify: `server/src/controllers/userController.ts`
- Modify: `server/src/routes/users.ts`

**Step 1: 在 userController.ts 添加 getUnassignedUsers 函数**

```typescript
/**
 * 获取未分配部门的用户（管理员）
 */
export async function getUnassignedUsers(_req: Request, res: Response) {
  const users = await prisma.user.findMany({
    where: {
      departmentId: null,
      isBanned: false
    },
    select: {
      id: true,
      email: true,
      nickname: true,
      avatar: true,
      createdAt: true
    },
    orderBy: { createdAt: 'desc' }
  })

  res.json({
    success: true,
    data: users
  })
}
```

**Step 2: 在 userController.ts 导出函数**

在文件末尾添加导出（如果需要）。

**Step 3: 在 routes/users.ts 添加路由**

在 `router.get('/search', ...)` 之前添加：

```typescript
/**
 * @route   GET /api/users/unassigned
 * @desc    获取未分配部门的用户
 * @access  Private (Admin)
 */
router.get('/unassigned', auth, requireAdmin, userController.getUnassignedUsers)
```

**Step 4: Commit**

```bash
git add server/src/controllers/userController.ts server/src/routes/users.ts
git commit -m "feat(server): add API to get unassigned users"
```

---

## Task 4: 扩展前端 API 接口

**Files:**
- Modify: `client/src/api/department.ts`
- Modify: `client/src/api/user.ts`
- Modify: `client/src/types/department.ts`

**Step 1: 在 types/department.ts 添加类型定义**

```typescript
// 批量添加成员请求
export interface AddMembersRequest {
  userIds: string[]
}

// 移除成员请求
export interface RemoveMemberRequest {
  transferToUserId?: string
}
```

**Step 2: 在 api/department.ts 修改 API 函数**

```typescript
/**
 * 批量添加部门成员
 */
export async function addDepartmentMembers(departmentId: string, userIds: string[]): Promise<{ message: string }> {
  const response = await post<{ message: string }>(`/departments/${departmentId}/members`, { userIds })
  return response.data!
}

/**
 * 移除部门成员（可选转移任务）
 */
export async function removeDepartmentMember(
  departmentId: string,
  userId: string,
  transferToUserId?: string
): Promise<void> {
  await del(`/departments/${departmentId}/members/${userId}`, transferToUserId ? { transferToUserId } : undefined)
}
```

**Step 3: 在 api/user.ts 添加获取未分配用户 API**

```typescript
/**
 * 获取未分配部门的用户
 */
export async function getUnassignedUsers(): Promise<User[]> {
  const response = await get<User[]>('/users/unassigned')
  return response.data || []
}
```

**Step 4: Commit**

```bash
git add client/src/api/department.ts client/src/api/user.ts client/src/types/department.ts
git commit -m "feat(client): add department member management API functions"
```

---

## Task 5: 重构 DepartmentManage.vue 为左右分栏布局

**Files:**
- Modify: `client/src/views/admin/DepartmentManage.vue`

**Step 1: 修改模板为左右分栏布局**

将现有的部门列表改为左侧 1/3 宽度，右侧 2/3 宽度显示选中部门的详情：

```vue
<template>
  <div class="space-y-6">
    <!-- 全局统计卡片（保持现有） -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <!-- ... 保持现有统计卡片代码 ... -->
    </div>

    <!-- 页面标题 -->
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">部门管理</h1>
        <p class="text-gray-500 mt-1">管理系统中的所有部门</p>
      </div>
      <button
        @click="showCreateModal = true"
        class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
      >
        <Plus class="w-4 h-4" />
        创建部门
      </button>
    </div>

    <!-- 左右分栏布局 -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- 左侧：部门列表 -->
      <div class="lg:col-span-1">
        <div class="bg-white rounded-lg border border-gray-200">
          <div class="p-3 border-b border-gray-200">
            <h2 class="font-medium text-gray-700">部门列表</h2>
          </div>
          <div v-if="loading" class="p-8 text-center text-gray-500">
            加载中...
          </div>
          <div v-else-if="departmentList.length === 0" class="p-8 text-center text-gray-500">
            暂无部门
          </div>
          <div v-else class="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
            <div
              v-for="dept in departmentList"
              :key="dept.id"
              @click="selectDepartment(dept)"
              :class="[
                'p-3 cursor-pointer transition-colors',
                selectedDepartment?.id === dept.id ? 'bg-blue-50 border-l-2 border-blue-500' : 'hover:bg-gray-50'
              ]"
            >
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Building2 class="w-4 h-4 text-blue-600" />
                </div>
                <div class="flex-1 min-w-0">
                  <h3 class="font-medium text-gray-900 truncate">{{ dept.name }}</h3>
                  <p class="text-xs text-gray-500">{{ dept.memberCount }} 人 · {{ dept.projectCount }} 项目</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧：部门详情 -->
      <div class="lg:col-span-2">
        <div v-if="!selectedDepartment" class="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Building2 class="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p class="text-gray-500">请从左侧选择一个部门查看详情</p>
        </div>
        <div v-else class="bg-white rounded-lg border border-gray-200">
          <!-- 部门信息头部 -->
          <div class="p-4 border-b border-gray-200">
            <div class="flex items-start justify-between">
              <div>
                <h2 class="text-lg font-semibold text-gray-900">{{ selectedDepartment.name }}</h2>
                <p class="text-sm text-gray-500 mt-1">{{ selectedDepartment.description || '暂无描述' }}</p>
              </div>
              <div class="flex gap-2">
                <button
                  @click="openEditModal(selectedDepartment)"
                  class="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  编辑部门
                </button>
                <button
                  @click="showAddMemberModal = true"
                  class="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  添加成员
                </button>
              </div>
            </div>
          </div>

          <!-- 成员列表表格 -->
          <div class="p-4">
            <h3 class="font-medium text-gray-700 mb-3">部门成员 ({{ members.length }})</h3>
            <div v-if="loadingMembers" class="py-8 text-center text-gray-500">
              加载中...
            </div>
            <div v-else-if="members.length === 0" class="py-8 text-center text-gray-500">
              暂无成员
            </div>
            <table v-else class="w-full">
              <thead>
                <tr class="text-left text-sm text-gray-500 border-b">
                  <th class="pb-2 font-medium">成员</th>
                  <th class="pb-2 font-medium">邮箱</th>
                  <th class="pb-2 font-medium">角色</th>
                  <th class="pb-2 font-medium text-right">操作</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr v-for="member in members" :key="member.id" class="text-sm">
                  <td class="py-3">
                    <div class="flex items-center gap-2">
                      <img
                        :src="member.avatar || '/default-avatar.png'"
                        class="w-8 h-8 rounded-full"
                        :alt="member.nickname"
                      />
                      <span class="font-medium text-gray-900">{{ member.nickname }}</span>
                    </div>
                  </td>
                  <td class="py-3 text-gray-500">{{ member.email }}</td>
                  <td class="py-3">
                    <span
                      :class="[
                        'px-2 py-0.5 text-xs rounded-full',
                        member.id === selectedDepartment.adminId
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-600'
                      ]"
                    >
                      {{ member.id === selectedDepartment.adminId ? '管理员' : '成员' }}
                    </span>
                  </td>
                  <td class="py-3 text-right">
                    <template v-if="member.id !== selectedDepartment.adminId">
                      <button
                        @click="openChangeAdminModal(member)"
                        class="text-blue-600 hover:text-blue-800 mr-3"
                      >
                        设为管理员
                      </button>
                      <button
                        @click="openRemoveMemberModal(member)"
                        class="text-red-600 hover:text-red-800"
                      >
                        移除
                      </button>
                    </template>
                    <span v-else class="text-gray-400">-</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- 弹窗组件（后续 Task 添加） -->
    <!-- ... -->
  </div>
</template>
```

**Step 2: 添加新的响应式状态**

```typescript
// 选中的部门
const selectedDepartment = ref<DepartmentListItem | null>(null)
const members = ref<Member[]>([])
const loadingMembers = ref(false)

// 弹窗状态
const showAddMemberModal = ref(false)
const showRemoveMemberModal = ref(false)
const showChangeAdminModal = ref(false)
const selectedMember = ref<Member | null>(null)
```

**Step 3: 添加选择部门和加载成员方法**

```typescript
// 成员类型
interface Member {
  id: string
  nickname: string
  email: string
  avatar: string | null
  isAdmin: boolean
}

// 选择部门并加载成员
async function selectDepartment(dept: DepartmentListItem) {
  selectedDepartment.value = dept
  await loadMembers(dept.id)
}

// 加载部门成员
async function loadMembers(departmentId: string) {
  loadingMembers.value = true
  try {
    const dept = await departmentStore.fetchDepartmentById(departmentId)
    if (dept && dept.members) {
      members.value = dept.members.map(m => ({
        id: m.id,
        nickname: m.nickname,
        email: m.email,
        avatar: m.avatar,
        isAdmin: m.id === dept.adminId
      }))
    }
  } catch (e) {
    console.error('加载成员失败:', e)
    members.value = []
  } finally {
    loadingMembers.value = false
  }
}
```

**Step 4: Commit**

```bash
git add client/src/views/admin/DepartmentManage.vue
git commit -m "feat(client): refactor DepartmentManage to split layout"
```

---

## Task 6: 实现添加成员弹窗

**Files:**
- Modify: `client/src/views/admin/DepartmentManage.vue`

**Step 1: 在模板中添加弹窗**

```vue
<!-- 添加成员弹窗 -->
<div
  v-if="showAddMemberModal"
  class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
  @click.self="showAddMemberModal = false"
>
  <div class="bg-white rounded-lg w-full max-w-lg max-h-[80vh] flex flex-col">
    <div class="p-4 border-b border-gray-200 flex items-center justify-between">
      <h2 class="text-lg font-semibold">添加成员到「{{ selectedDepartment?.name }}」</h2>
      <button @click="showAddMemberModal = false" class="text-gray-400 hover:text-gray-600">
        <X class="w-5 h-5" />
      </button>
    </div>

    <!-- 搜索框 -->
    <div class="p-4 border-b border-gray-200">
      <div class="relative">
        <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          v-model="memberSearchKeyword"
          type="text"
          placeholder="搜索用户（昵称或邮箱）"
          class="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          @input="debouncedSearchUsers"
        />
      </div>
    </div>

    <!-- 用户列表 -->
    <div class="flex-1 overflow-y-auto p-4">
      <!-- 未分配部门的用户 -->
      <div v-if="!memberSearchKeyword && unassignedUsers.length > 0">
        <h3 class="text-sm font-medium text-gray-500 mb-2">未分配部门的用户</h3>
        <div class="space-y-2">
          <label
            v-for="user in unassignedUsers"
            :key="user.id"
            class="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
          >
            <input
              type="checkbox"
              :value="user.id"
              v-model="selectedUserIds"
              class="rounded border-gray-300"
            />
            <img :src="user.avatar || '/default-avatar.png'" class="w-8 h-8 rounded-full" />
            <div>
              <p class="font-medium text-gray-900">{{ user.nickname }}</p>
              <p class="text-xs text-gray-500">{{ user.email }}</p>
            </div>
          </label>
        </div>
      </div>

      <!-- 搜索结果 -->
      <div v-if="memberSearchKeyword && searchResults.length > 0">
        <h3 class="text-sm font-medium text-gray-500 mb-2">搜索结果</h3>
        <div class="space-y-2">
          <label
            v-for="user in searchResults"
            :key="user.id"
            class="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
          >
            <input
              type="checkbox"
              :value="user.id"
              v-model="selectedUserIds"
              class="rounded border-gray-300"
            />
            <img :src="user.avatar || '/default-avatar.png'" class="w-8 h-8 rounded-full" />
            <div class="flex-1">
              <p class="font-medium text-gray-900">{{ user.nickname }}</p>
              <p class="text-xs text-gray-500">{{ user.email }}</p>
            </div>
            <span v-if="user.department" class="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
              {{ user.department.name }}
            </span>
          </label>
        </div>
      </div>

      <div v-if="memberSearchKeyword && searchResults.length === 0 && !searchingUsers" class="text-center py-8 text-gray-500">
        未找到匹配的用户
      </div>
    </div>

    <!-- 底部操作 -->
    <div class="p-4 border-t border-gray-200 flex justify-end gap-3">
      <button
        @click="showAddMemberModal = false"
        class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
      >
        取消
      </button>
      <button
        @click="handleAddMembers"
        :disabled="selectedUserIds.length === 0 || addingMembers"
        class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {{ addingMembers ? '添加中...' : `添加选中 (${selectedUserIds.length})` }}
      </button>
    </div>
  </div>
</div>
```

**Step 2: 添加相关状态和方法**

```typescript
import { debounce } from 'lodash-es'
import * as userApi from '@/api/user'

// 添加成员相关
const memberSearchKeyword = ref('')
const unassignedUsers = ref<User[]>([])
const searchResults = ref<User[]>([])
const selectedUserIds = ref<string[]>([])
const searchingUsers = ref(false)
const addingMembers = ref(false)

// 获取未分配部门的用户
async function fetchUnassignedUsers() {
  try {
    unassignedUsers.value = await userApi.getUnassignedUsers()
  } catch (e) {
    console.error('获取未分配用户失败:', e)
  }
}

// 搜索用户
async function searchUsers() {
  if (!memberSearchKeyword.value || memberSearchKeyword.value.length < 2) {
    searchResults.value = []
    return
  }

  searchingUsers.value = true
  try {
    searchResults.value = await departmentApi.searchUsersForDepartment(
      memberSearchKeyword.value,
      selectedDepartment.value?.id
    )
  } catch (e) {
    console.error('搜索用户失败:', e)
    searchResults.value = []
  } finally {
    searchingUsers.value = false
  }
}

// 防抖搜索
const debouncedSearchUsers = debounce(searchUsers, 300)

// 添加选中的成员
async function handleAddMembers() {
  if (selectedUserIds.value.length === 0 || !selectedDepartment.value) return

  addingMembers.value = true
  try {
    await departmentApi.addDepartmentMembers(selectedDepartment.value.id, selectedUserIds.value)
    showAddMemberModal.value = false
    selectedUserIds.value = []
    memberSearchKeyword.value = ''
    searchResults.value = []
    await fetchUnassignedUsers()
    await loadMembers(selectedDepartment.value.id)
  } catch (e) {
    console.error('添加成员失败:', e)
  } finally {
    addingMembers.value = false
  }
}

// 打开添加成员弹窗时加载数据
watch(showAddMemberModal, (show) => {
  if (show) {
    fetchUnassignedUsers()
    selectedUserIds.value = []
    memberSearchKeyword.value = ''
    searchResults.value = []
  }
})
```

**Step 3: Commit**

```bash
git add client/src/views/admin/DepartmentManage.vue
git commit -m "feat(client): add member selection modal with search"
```

---

## Task 7: 实现移除成员弹窗

**Files:**
- Modify: `client/src/views/admin/DepartmentManage.vue`

**Step 1: 在模板中添加弹窗**

```vue
<!-- 移除成员弹窗 -->
<div
  v-if="showRemoveMemberModal && selectedMember"
  class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
  @click.self="showRemoveMemberModal = false"
>
  <div class="bg-white rounded-lg w-full max-w-md p-6">
    <h2 class="text-lg font-semibold mb-4">移除成员</h2>

    <p class="text-gray-600 mb-4">
      确定要将「<span class="font-medium text-gray-900">{{ selectedMember.nickname }}</span>」从「{{ selectedDepartment?.name }}」移除吗？
    </p>

    <!-- 任务信息 -->
    <div v-if="memberTasks.length > 0" class="mb-4">
      <p class="text-gray-600 mb-2">该成员有 {{ memberTasks.length }} 个负责的任务：</p>
      <div class="bg-gray-50 rounded-lg p-3 max-h-32 overflow-y-auto">
        <div v-for="task in memberTasks" :key="task.id" class="text-sm text-gray-600 mb-1">
          • {{ task.title }}
          <span :class="taskStatusClass(task.status)">({{ taskStatusText(task.status) }})</span>
        </div>
      </div>
    </div>

    <!-- 转移选项 -->
    <div v-if="memberTasks.length > 0" class="mb-4">
      <label class="block text-sm font-medium text-gray-700 mb-1">将任务转移给：</label>
      <select
        v-model="transferToUserId"
        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
      >
        <option value="">请选择部门成员</option>
        <option
          v-for="member in otherMembers"
          :key="member.id"
          :value="member.id"
        >
          {{ member.nickname }}
        </option>
      </select>

      <label class="flex items-center gap-2 mt-2 text-sm text-gray-600">
        <input type="checkbox" v-model="skipTransfer" class="rounded border-gray-300" />
        不转移任务，直接移除
      </label>
    </div>

    <div class="flex justify-end gap-3 mt-6">
      <button
        @click="showRemoveMemberModal = false"
        class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
      >
        取消
      </button>
      <button
        @click="handleRemoveMember"
        :disabled="removingMember || (memberTasks.length > 0 && !transferToUserId && !skipTransfer)"
        class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
      >
        {{ removingMember ? '移除中...' : '确认移除' }}
      </button>
    </div>
  </div>
</div>
```

**Step 2: 添加相关状态和方法**

```typescript
// 移除成员相关
const memberTasks = ref<{ id: string; title: string; status: string }[]>([])
const transferToUserId = ref('')
const skipTransfer = ref(false)
const removingMember = ref(false)

// 获取其他成员（排除要移除的成员）
const otherMembers = computed(() => {
  return members.value.filter(m => m.id !== selectedMember.value?.id)
})

// 打开移除成员弹窗
async function openRemoveMemberModal(member: Member) {
  selectedMember.value = member
  transferToUserId.value = ''
  skipTransfer.value = false
  memberTasks.value = []

  // 获取该成员的任务
  try {
    const response = await get<{ tasks: { id: string; title: string; status: string }[] }>(
      `/users/${member.id}/tasks`
    )
    memberTasks.value = response.data?.tasks || []
  } catch (e) {
    console.error('获取任务失败:', e)
  }

  showRemoveMemberModal.value = true
}

// 移除成员
async function handleRemoveMember() {
  if (!selectedDepartment.value || !selectedMember.value) return

  if (memberTasks.value.length > 0 && !skipTransfer.value && !transferToUserId.value) {
    return
  }

  removingMember.value = true
  try {
    await departmentApi.removeDepartmentMember(
      selectedDepartment.value.id,
      selectedMember.value.id,
      skipTransfer.value ? undefined : transferToUserId.value
    )
    showRemoveMemberModal.value = false
    await loadMembers(selectedDepartment.value.id)
  } catch (e) {
    console.error('移除成员失败:', e)
  } finally {
    removingMember.value = false
  }
}

// 任务状态文本
function taskStatusText(status: string) {
  const map: Record<string, string> = {
    TODO: '待办',
    IN_PROGRESS: '进行中',
    DONE: '已完成'
  }
  return map[status] || status
}

// 任务状态样式
function taskStatusClass(status: string) {
  const map: Record<string, string> = {
    TODO: 'text-gray-400',
    IN_PROGRESS: 'text-blue-500',
    DONE: 'text-green-500'
  }
  return map[status] || ''
}
```

**Step 3: Commit**

```bash
git add client/src/views/admin/DepartmentManage.vue
git commit -m "feat(client): add remove member modal with task transfer"
```

---

## Task 8: 实现更换管理员弹窗

**Files:**
- Modify: `client/src/views/admin/DepartmentManage.vue`

**Step 1: 在模板中添加弹窗**

```vue
<!-- 更换管理员弹窗 -->
<div
  v-if="showChangeAdminModal && selectedMember"
  class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
  @click.self="showChangeAdminModal = false"
>
  <div class="bg-white rounded-lg w-full max-w-md p-6">
    <h2 class="text-lg font-semibold mb-4">更换部门管理员</h2>

    <div class="bg-gray-50 rounded-lg p-4 mb-4">
      <p class="text-sm text-gray-500 mb-1">当前管理员</p>
      <p class="font-medium text-gray-900">
        {{ members.find(m => m.id === selectedDepartment?.adminId)?.nickname || '未知' }}
      </p>
    </div>

    <p class="text-gray-600 mb-4">
      确定将管理员变更为「<span class="font-medium text-gray-900">{{ selectedMember.nickname }}</span>」吗？
    </p>

    <div class="bg-blue-50 rounded-lg p-4 mb-4">
      <p class="text-sm text-blue-700">变更后：</p>
      <ul class="text-sm text-blue-600 mt-1 list-disc list-inside">
        <li>原管理员将成为普通成员</li>
        <li>{{ selectedMember.nickname }} 将成为部门管理员</li>
      </ul>
    </div>

    <div class="flex justify-end gap-3">
      <button
        @click="showChangeAdminModal = false"
        class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
      >
        取消
      </button>
      <button
        @click="handleChangeAdmin"
        :disabled="changingAdmin"
        class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {{ changingAdmin ? '更换中...' : '确认更换' }}
      </button>
    </div>
  </div>
</div>
```

**Step 2: 添加相关状态和方法**

```typescript
// 更换管理员相关
const changingAdmin = ref(false)

// 打开更换管理员弹窗
function openChangeAdminModal(member: Member) {
  selectedMember.value = member
  showChangeAdminModal.value = true
}

// 更换管理员
async function handleChangeAdmin() {
  if (!selectedDepartment.value || !selectedMember.value) return

  changingAdmin.value = true
  try {
    await departmentStore.changeAdmin(selectedDepartment.value.id, selectedMember.value.id)
    showChangeAdminModal.value = false
    // 更新本地状态
    selectedDepartment.value = {
      ...selectedDepartment.value,
      adminId: selectedMember.value.id
    }
    await loadMembers(selectedDepartment.value.id)
  } catch (e) {
    console.error('更换管理员失败:', e)
  } finally {
    changingAdmin.value = false
  }
}
```

**Step 3: Commit**

```bash
git add client/src/views/admin/DepartmentManage.vue
git commit -m "feat(client): add change admin modal"
```

---

## Task 9: 添加必要的导入和图标

**Files:**
- Modify: `client/src/views/admin/DepartmentManage.vue`

**Step 1: 添加图标导入**

```typescript
import { Plus, Building2, Users, FolderKanban, Pencil, Trash2, CheckCircle, X, Search } from 'lucide-vue-next'
```

**Step 2: 添加必要的导入**

```typescript
import { ref, onMounted, computed, watch } from 'vue'
import { debounce } from 'lodash-es'
import { useDepartmentStore } from '@/stores/department'
import * as departmentApi from '@/api/department'
import * as userApi from '@/api/user'
import { get } from '@/utils/request'
import type { User } from '@/types/user'
import StatisticsCard from '@/components/StatisticsCard.vue'
import ProgressBar from '@/components/ProgressBar.vue'
import { getAdminDashboard, type AdminDashboard } from '@/api/dashboard'
```

**Step 3: Commit**

```bash
git add client/src/views/admin/DepartmentManage.vue
git commit -m "feat(client): add necessary imports for member management"
```

---

## Task 10: 集成测试和修复

**Step 1: 启动后端服务**

```bash
cd server && npm run dev
```

**Step 2: 启动前端服务**

```bash
cd client && npm run dev
```

**Step 3: 测试功能清单**

- [ ] 选择部门后正确显示成员列表
- [ ] 添加成员弹窗正常打开，显示未分配用户
- [ ] 搜索用户功能正常
- [ ] 批量添加成员成功
- [ ] 移除成员弹窗显示任务列表
- [ ] 转移任务功能正常
- [ ] 更换管理员功能正常
- [ ] 删除部门功能仍然正常

**Step 4: 修复发现的问题**

如果发现问题，创建单独的 commit 修复。

**Step 5: 最终 Commit**

```bash
git add .
git commit -m "feat: complete department member management feature"
```

---

## 文件变更总结

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `server/src/controllers/departmentController.ts` | 修改 | 支持批量添加、任务转移 |
| `server/src/controllers/userController.ts` | 修改 | 添加获取未分配用户 API |
| `server/src/routes/users.ts` | 修改 | 添加新路由 |
| `client/src/api/department.ts` | 修改 | 添加新 API 函数 |
| `client/src/api/user.ts` | 修改 | 添加获取未分配用户函数 |
| `client/src/types/department.ts` | 修改 | 添加新类型定义 |
| `client/src/views/admin/DepartmentManage.vue` | 重构 | 左右分栏布局 + 成员管理弹窗 |
