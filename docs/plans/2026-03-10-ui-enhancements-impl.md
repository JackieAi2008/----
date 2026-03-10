# 协同日历 UI 优化实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 完成移动端响应式优化、项目/任务删除功能、导航结构完善和部门信息展示

**Architecture:** 基于 Vue 3 + Tailwind CSS，通过添加响应式断点类和组件增强实现 UI 优化，复用现有 API 和 Store 方法

**Tech Stack:** Vue 3, TypeScript, Tailwind CSS, Pinia, Vue Router

---

## Task 1: 添加回收站入口到侧边栏导航

**Files:**
- Modify: `client/src/layouts/MainLayout.vue:22-56`

**Step 1: 在项目菜单下方添加回收站链接**

找到导航菜单部分（约第22-56行），在项目菜单后添加回收站链接：

```vue
<!-- 在 </li> 项目菜单后添加 -->
          <li>
            <NavItem
              to="/projects/deleted"
              icon="Trash2"
              label="回收站"
              :active="currentRoute === '/projects/deleted'"
            />
          </li>
```

**Step 2: 添加管理员菜单区块**

在回收站链接后添加管理员专属菜单（约第56行后）：

```vue
        <!-- 管理员菜单 -->
        <template v-if="authStore.isAdmin || authStore.isDepartmentAdmin">
          <li class="pt-4">
            <span class="px-3 text-xs font-medium text-blue-200/50 uppercase tracking-wider">管理</span>
          </li>
          <li v-if="authStore.isAdmin">
            <NavItem
              to="/admin/departments"
              icon="Building2"
              label="部门管理"
              :active="currentRoute === '/admin/departments'"
            />
          </li>
          <li v-if="authStore.isDepartmentAdmin && !authStore.isAdmin">
            <NavItem
              to="/my-department"
              icon="Users"
              label="我的部门"
              :active="currentRoute === '/my-department'"
            />
          </li>
        </template>
```

**Step 3: 验证导航显示**

Run: 启动开发服务器 `cd client && npm run dev`
Expected: 侧边栏显示回收站链接，管理员用户看到管理菜单

**Step 4: Commit**

```bash
git add client/src/layouts/MainLayout.vue
git commit -m "feat(nav): add deleted projects and admin menu to sidebar

- Add recycle bin link to sidebar navigation
- Add admin menu section for department management
- Show management menu only to admin users

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 2: 项目列表添加删除功能

**Files:**
- Modify: `client/src/views/project/ProjectList.vue`

**Step 1: 添加删除相关的导入和状态**

在 script 部分，添加 Trash2 图标导入和删除相关状态：

```typescript
// 修改导入行，添加 Trash2
import { Plus, FolderOpen, FolderKanban, Trash2 } from 'lucide-vue-next'

// 在 const creating = ref(false) 后添加
const showDeleteConfirm = ref(false)
const projectToDelete = ref<Project | null>(null)
const deleting = ref(false)
```

**Step 2: 添加删除确认弹窗模板**

在 `</Transition>` (创建项目弹窗) 后添加删除确认弹窗：

```vue
    <!-- 删除确认弹窗 -->
    <Transition name="fade">
      <div v-if="showDeleteConfirm" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-scale-in">
          <div class="p-6 text-center">
            <div class="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 class="w-7 h-7 text-red-600" />
            </div>
            <h3 class="text-lg font-semibold text-gray-800 mb-2">确认删除项目？</h3>
            <p class="text-gray-500 text-sm mb-6">
              项目「{{ projectToDelete?.name }}」将移入回收站，30天内可恢复
            </p>
            <div class="flex gap-3">
              <button
                @click="showDeleteConfirm = false; projectToDelete = null"
                class="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 font-medium transition-colors"
              >
                取消
              </button>
              <button
                @click="handleDeleteProject"
                :disabled="deleting"
                class="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {{ deleting ? '删除中...' : '确认删除' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
```

**Step 3: 在项目卡片上添加删除按钮**

找到项目卡片的封面 div（约第40行），在可见性标签后添加删除按钮：

```vue
          <!-- 可见性标签 -->
          <span
            class="absolute top-3 right-3 px-2.5 py-1 text-xs rounded-lg font-medium backdrop-blur-sm"
            :class="project.visibility === 'PUBLIC' ? 'bg-green-500/90 text-white' : 'bg-gray-900/70 text-white'"
          >
            {{ project.visibility === 'PUBLIC' ? '公开' : '私密' }}
          </span>
          <!-- 删除按钮 -->
          <button
            @click.stop="confirmDelete(project)"
            class="absolute top-3 left-3 p-2 bg-white/90 rounded-lg shadow opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 transition-all duration-200"
            title="删除项目"
          >
            <Trash2 class="w-4 h-4" />
          </button>
```

**Step 4: 添加删除处理函数**

在 script 部分添加删除相关函数：

```typescript
// 确认删除
function confirmDelete(project: Project) {
  projectToDelete.value = project
  showDeleteConfirm.value = true
}

// 执行删除
async function handleDeleteProject() {
  if (!projectToDelete.value) return

  deleting.value = true
  try {
    await projectStore.deleteProject(projectToDelete.value.id)
    showDeleteConfirm.value = false
    projectToDelete.value = null
  } catch (error) {
    devLog.error('删除项目失败', error)
    alert('删除项目失败')
  } finally {
    deleting.value = false
  }
}
```

**Step 5: 添加 Project 类型导入**

```typescript
import type { Project } from '@/types/project'
```

**Step 6: 验证功能**

Run: 在项目列表页测试删除按钮
Expected: 悬停显示删除按钮，点击弹出确认框，确认后项目消失

**Step 7: Commit**

```bash
git add client/src/views/project/ProjectList.vue
git commit -m "feat(projects): add delete button to project cards

- Add delete button visible on hover
- Add confirmation dialog before deletion
- Soft delete moves project to recycle bin

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 3: 项目详情页添加任务删除功能

**Files:**
- Modify: `client/src/views/project/ProjectDetail.vue`

**Step 1: 添加删除相关导入**

```typescript
// 在 import { User, Plus } from 'lucide-vue-next' 添加 Trash2
import { User, Plus, Trash2 } from 'lucide-vue-next'

// 添加 deleteTask API 导入
import { getTasks, deleteTask } from '@/api/task'
```

**Step 2: 添加删除状态**

在 `const transferring = ref(false)` 后添加：

```typescript
const taskToDelete = ref<Task | null>(null)
const showDeleteTaskConfirm = ref(false)
const deletingTask = ref(false)
```

**Step 3: 修改任务列表项添加删除按钮**

找到任务列表项（约第88-110行），修改为：

```vue
        <div v-else class="space-y-3">
          <div
            v-for="task in tasks"
            :key="task.id"
            class="group p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer flex items-center justify-between"
            @click="goToTask(task.id)"
          >
            <div class="flex-1">
              <h4 class="font-medium text-gray-800">{{ task.title }}</h4>
              <p class="text-sm text-gray-500 mt-1">
                截止日期：{{ formatDateTime(task.dueDate) }}
              </p>
            </div>
            <div class="flex items-center gap-3">
              <span
                class="px-2 py-1 rounded text-xs"
                :class="getStatusClass(task.status)"
              >
                {{ getStatusText(task.status) }}
              </span>
              <button
                @click.stop="confirmDeleteTask(task)"
                class="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                title="删除任务"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
```

**Step 4: 添加任务删除确认弹窗**

在移交项目弹窗后添加：

```vue
    <!-- 删除任务确认弹窗 -->
    <div v-if="showDeleteTaskConfirm" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div class="text-center mb-4">
          <div class="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Trash2 class="w-6 h-6 text-red-600" />
          </div>
          <h3 class="text-lg font-semibold">确认删除任务？</h3>
          <p class="text-gray-500 text-sm mt-2">
            任务「{{ taskToDelete?.title }}」将被归档
          </p>
        </div>
        <div class="flex justify-end gap-3">
          <button
            @click="showDeleteTaskConfirm = false; taskToDelete = null"
            class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            取消
          </button>
          <button
            @click="handleDeleteTask"
            :disabled="deletingTask"
            class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {{ deletingTask ? '删除中...' : '确认删除' }}
          </button>
        </div>
      </div>
    </div>
```

**Step 5: 添加删除处理函数**

```typescript
// 确认删除任务
function confirmDeleteTask(task: Task) {
  taskToDelete.value = task
  showDeleteTaskConfirm.value = true
}

// 执行删除任务
async function handleDeleteTask() {
  if (!taskToDelete.value) return

  deletingTask.value = true
  try {
    await deleteTask(taskToDelete.value.id)
    showDeleteTaskConfirm.value = false
    taskToDelete.value = null
    // 刷新任务列表
    await fetchData()
  } catch {
    alert('删除任务失败')
  } finally {
    deletingTask.value = false
  }
}
```

**Step 6: 验证功能**

Run: 在项目详情页测试任务删除
Expected: 悬停显示删除按钮，确认后任务从列表移除

**Step 7: Commit**

```bash
git add client/src/views/project/ProjectDetail.vue
git commit -m "feat(project): add task delete functionality

- Add delete button to task items (visible on hover)
- Add confirmation dialog for task deletion
- Refresh task list after deletion

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 4: 设置页面添加部门信息展示

**Files:**
- Modify: `client/src/views/settings/SettingsPage.vue`

**Step 1: 添加部门相关导入和状态**

```typescript
import { useDepartmentStore } from '@/stores/department'

const departmentStore = useDepartmentStore()
const userDepartment = computed(() => departmentStore.myDepartment)
```

**Step 2: 在个人信息卡片后添加部门信息卡片**

在 `</div>` (个人信息卡片结束) 后、修改密码卡片前添加：

```vue
    <!-- 部门信息 -->
    <div class="bg-white rounded-lg border border-gray-200 p-6 mb-6">
      <h3 class="text-lg font-semibold mb-4">部门信息</h3>
      <div v-if="userDepartment" class="flex items-center gap-4">
        <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
          <Building2 class="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <p class="font-medium text-gray-800">{{ userDepartment.name }}</p>
          <p class="text-sm text-gray-500">{{ userDepartment.description || '暂无描述' }}</p>
        </div>
      </div>
      <div v-else class="flex items-center gap-4 text-gray-500">
        <div class="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
          <Building2 class="w-6 h-6 text-gray-400" />
        </div>
        <div>
          <p class="font-medium">未加入部门</p>
          <p class="text-sm">您目前不属于任何部门</p>
        </div>
      </div>
    </div>
```

**Step 3: 添加 Building2 图标导入和 computed**

```typescript
import { Building2 } from 'lucide-vue-next'
import { computed, ref, reactive, onMounted } from 'vue'
```

**Step 4: 在 onMounted 中加载部门信息**

```typescript
onMounted(async () => {
  if (authStore.user) {
    profileForm.nickname = authStore.user.nickname
    profileForm.bio = authStore.user.bio || ''
  }
  // 加载用户部门信息
  try {
    await departmentStore.fetchMyDepartment()
  } catch {
    // 用户可能没有部门，忽略错误
  }
})
```

**Step 5: 验证功能**

Run: 检查设置页面部门信息显示
Expected: 显示用户所属部门或"未加入部门"提示

**Step 6: Commit**

```bash
git add client/src/views/settings/SettingsPage.vue
git commit -m "feat(settings): add department info section

- Display user's department in settings page
- Show placeholder when user has no department
- Fetch department info on mount

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 5: 日历页面移动端响应式优化

**Files:**
- Modify: `client/src/views/calendar/CalendarPage.vue`

**Step 1: 优化工具栏布局为响应式**

找到工具栏区域，修改为响应式布局：

```vue
    <!-- 工具栏 -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 md:mb-6">
      <!-- 左侧：月份导航 -->
      <div class="flex items-center justify-between sm:justify-start gap-2 sm:gap-4">
        <button
          @click="navigateMonth(-1)"
          class="p-2 hover:bg-gray-100 rounded-xl transition-colors"
        >
          <ChevronLeft class="w-5 h-5" />
        </button>
        <h2 class="text-base sm:text-lg md:text-xl font-semibold" style="color: var(--color-text-primary)">
          {{ currentYear }}年{{ currentMonth + 1 }}月
        </h2>
        <button
          @click="navigateMonth(1)"
          class="p-2 hover:bg-gray-100 rounded-xl transition-colors"
        >
          <ChevronRight class="w-5 h-5" />
        </button>
        <button
          @click="goToToday"
          class="hidden sm:block px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
        >
          今天
        </button>
      </div>

      <!-- 右侧：视图切换和筛选 -->
      <div class="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-1 sm:pb-0">
        <!-- 视图切换 -->
        <div class="flex bg-gray-100 rounded-lg p-1 flex-shrink-0">
          <button
            v-for="view in views"
            :key="view.value"
            @click="currentView = view.value"
            class="px-2 sm:px-3 py-1.5 text-xs sm:text-sm rounded-md transition-colors whitespace-nowrap"
            :class="currentView === view.value ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-800'"
          >
            {{ view.label }}
          </button>
        </div>

        <!-- 项目筛选 -->
        <select
          v-model="selectedProjectId"
          class="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-200 rounded-lg text-xs sm:text-sm bg-white flex-shrink-0"
        >
          <option value="">全部项目</option>
          <option v-for="project in projects" :key="project.id" :value="project.id">
            {{ project.name }}
          </option>
        </select>
      </div>
    </div>
```

**Step 2: 添加移动端今天按钮**

在工具栏下方添加移动端今天按钮：

```vue
    <!-- 移动端今天按钮 -->
    <button
      @click="goToToday"
      class="sm:hidden mb-4 w-full py-2.5 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 flex items-center justify-center gap-2"
    >
      <Calendar class="w-4 h-4" />
      回到今天
    </button>
```

**Step 3: 优化日历网格响应式**

找到日历网格部分，添加响应式类：

```vue
    <!-- 日历网格 -->
    <div class="bg-white rounded-xl sm:rounded-2xl border border-gray-100 shadow-card overflow-hidden">
      <!-- 星期标题 -->
      <div class="grid grid-cols-7 bg-gray-50/50">
        <div
          v-for="day in weekDays"
          :key="day"
          class="p-2 sm:p-3 text-center text-xs sm:text-sm font-medium text-gray-500"
        >
          <span class="hidden sm:inline">{{ day }}</span>
          <span class="sm:hidden">{{ day.slice(0, 1) }}</span>
        </div>
      </div>
      <!-- ... 日期单元格 ... -->
    </div>
```

**Step 4: 验证响应式效果**

Run: 调整浏览器窗口大小测试
Expected: 移动端工具栏垂直堆叠，按钮尺寸适中

**Step 5: Commit**

```bash
git add client/src/views/calendar/CalendarPage.vue
git commit -m "style(calendar): improve mobile responsive layout

- Stack toolbar vertically on mobile
- Add responsive text and button sizes
- Show abbreviated weekday names on mobile
- Add mobile-friendly today button

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 6: 侧边栏移动端优化

**Files:**
- Modify: `client/src/layouts/MainLayout.vue`

**Step 1: 优化移动端侧边栏样式**

找到侧边栏 aside 元素，确保移动端正确隐藏：

```vue
    <!-- 侧边栏 -->
    <aside
      class="w-64 flex flex-col fixed h-full z-30 transition-transform duration-300 sidebar-gradient"
      :class="{ '-translate-x-full': !sidebarOpen, 'translate-x-0': sidebarOpen }"
    >
```

说明：当前代码已有 `md:translate-x-0`，需要移除这个类，改为纯 JS 控制显示/隐藏

**Step 2: 优化主内容区响应式**

```vue
    <!-- 主内容区 -->
    <div class="flex-1 md:ml-64 flex flex-col min-h-screen">
```

**Step 3: 添加移动端侧边栏动画样式**

在 `<style scoped>` 中添加：

```css
/* 移动端侧边栏滑入动画 */
@media (max-width: 768px) {
  .sidebar-gradient {
    transform: translateX(-100%);
  }
  .sidebar-gradient.translate-x-0 {
    transform: translateX(0);
  }
}
```

**Step 4: 验证移动端效果**

Run: 在移动端尺寸测试侧边栏
Expected: 默认隐藏，点击汉堡菜单滑入，点击遮罩关闭

**Step 5: Commit**

```bash
git add client/src/layouts/MainLayout.vue
git commit -m "style(layout): improve mobile sidebar animation

- Ensure sidebar is hidden by default on mobile
- Add smooth slide-in animation
- Improve z-index layering

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 7: 项目详情页移动端响应式优化

**Files:**
- Modify: `client/src/views/project/ProjectDetail.vue`

**Step 1: 优化项目头部响应式**

```vue
      <!-- 项目头部 -->
      <div class="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 mb-4 sm:mb-6">
        <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h2 class="text-xl sm:text-2xl font-bold text-gray-800">{{ project.name }}</h2>
            <p v-if="project.description" class="text-gray-500 mt-2 text-sm sm:text-base">{{ project.description }}</p>
            <div class="flex flex-wrap items-center gap-2 sm:gap-4 mt-4">
              <!-- ... 标签和日期 ... -->
            </div>
          </div>
          <div class="flex flex-wrap gap-2 sm:gap-2">
            <button
              v-if="isOwner"
              @click="openEditDialog"
              class="px-3 py-1.5 sm:py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              编辑
            </button>
            <button
              v-if="isOwner"
              @click="openTransferDialog"
              class="px-3 py-1.5 sm:py-1 text-sm border border-orange-300 text-orange-600 rounded-lg hover:bg-orange-50"
            >
              移交项目
            </button>
            <button
              @click="showInviteMember = true"
              class="px-3 py-1.5 sm:py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              邀请成员
            </button>
          </div>
        </div>
      </div>
```

**Step 2: 优化成员列表响应式**

```vue
      <!-- 成员列表 -->
      <div class="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 mb-4 sm:mb-6">
        <h3 class="text-base sm:text-lg font-semibold mb-3 sm:mb-4">项目成员</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
```

**Step 3: 优化任务列表响应式**

```vue
      <!-- 任务列表 -->
      <div class="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4">
          <h3 class="text-base sm:text-lg font-semibold">任务列表</h3>
          <button
            @click="showCreateTask = true"
            class="flex items-center justify-center gap-2 px-3 py-1.5 sm:py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus class="w-4 h-4" />
            新建任务
          </button>
        </div>
```

**Step 4: Commit**

```bash
git add client/src/views/project/ProjectDetail.vue
git commit -m "style(project-detail): improve mobile responsive layout

- Stack header actions on mobile
- Responsive padding and text sizes
- Responsive grid for member list

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 8: 添加项目统计摘要到项目详情页

**Files:**
- Modify: `client/src/views/project/ProjectDetail.vue`

**Step 1: 添加计算属性**

在 `const isOwner` 后添加：

```typescript
// 任务统计
const taskStats = computed(() => {
  const total = tasks.value.length
  const done = tasks.value.filter(t => t.status === 'DONE').length
  const inProgress = tasks.value.filter(t => t.status === 'IN_PROGRESS').length
  const todo = tasks.value.filter(t => t.status === 'TODO').length
  return { total, done, inProgress, todo }
})
```

**Step 2: 在任务列表标题后添加统计摘要**

```vue
      <!-- 任务列表 -->
      <div class="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4">
          <div>
            <h3 class="text-base sm:text-lg font-semibold">任务列表</h3>
            <p class="text-sm text-gray-500 mt-1">
              共 {{ taskStats.total }} 个任务 · 已完成 {{ taskStats.done }} · 进行中 {{ taskStats.inProgress }}
            </p>
          </div>
          <button ...>
```

**Step 3: 添加进度条（可选增强）**

在统计摘要下方添加进度条：

```vue
          <!-- 进度条 -->
          <div v-if="taskStats.total > 0" class="w-full sm:w-32 h-2 bg-gray-100 rounded-full overflow-hidden mt-2 sm:mt-0">
            <div
              class="h-full bg-green-500 rounded-full transition-all duration-300"
              :style="{ width: `${(taskStats.done / taskStats.total) * 100}%` }"
            ></div>
          </div>
```

**Step 4: Commit**

```bash
git add client/src/views/project/ProjectDetail.vue
git commit -m "feat(project): add task statistics summary

- Show total, done, and in-progress counts
- Add progress bar visualization
- Display statistics in task list header

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 9: 构建和验证

**Step 1: 运行前端构建**

```bash
cd client && npm run build
```

Expected: 构建成功，无 TypeScript 错误

**Step 2: 运行后端测试（如有）**

```bash
cd server && npm test
```

Expected: 所有测试通过

**Step 3: 手动验证清单**

- [ ] 侧边栏显示回收站链接
- [ ] 管理员看到管理菜单
- [ ] 项目列表卡片显示删除按钮
- [ ] 项目详情页任务显示删除按钮
- [ ] 设置页面显示部门信息
- [ ] 日历页面移动端布局正确
- [ ] 侧边栏移动端折叠正常

**Step 4: Final Commit**

```bash
git add -A
git commit -m "chore: final verification and cleanup

- Verify all UI enhancements working correctly
- Clean up any console errors
- Update build artifacts

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## 风险和注意事项

1. **删除操作**：确保使用软删除 API，不要调用永久删除
2. **权限检查**：删除按钮应只对有权限的用户显示
3. **移动端测试**：使用 Chrome DevTools 模拟移动设备测试
4. **状态同步**：删除后需刷新相关列表数据

---

*文档版本: 1.0*
*创建日期: 2026-03-10*
*基于设计文档: 2026-03-10-ui-enhancements-design.md*
