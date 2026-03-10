# 协同日历系统优化设计文档

## 概述

本文档针对协同日历系统的四个优化需求进行设计：
1. 移动端自适应显示优化
2. 项目和任务删除功能
3. 页面数据关联和统计逻辑验证
4. 人员管理页面和逻辑完善

## 1. 移动端自适应显示优化

### 1.1 当前状态分析

已完成响应式优化的页面：
- ✅ Login.vue - 登录页面
- ✅ Register.vue - 注册页面
- ✅ DashboardPage.vue - 仪表盘页面
- ✅ ProjectList.vue - 项目列表页面

需要优化的页面：
- ❌ CalendarPage.vue - 日历页面（工具栏、视图切换）
- ❌ ProjectDetail.vue - 项目详情页面
- ❌ TaskDetail.vue - 任务详情页面
- ❌ ReportsPage.vue - 报告页面
- ❌ SettingsPage.vue - 设置页面
- ❌ MainLayout.vue - 主布局（侧边栏折叠）

### 1.2 设计方案

#### 1.2.1 侧边栏移动端适配

**当前问题**：侧边栏在移动端占用过多空间，需要折叠为汉堡菜单

**方案**：
```
移动端 (< 768px):
├── 顶部导航栏
│   ├── 汉堡菜单按钮
│   ├── Logo
│   └── 用户头像
├── 点击汉堡菜单 → 全屏侧边栏抽屉
│   ├── 遮罩层点击关闭
│   └── 导航菜单项
```

**实现要点**：
- 添加 `isMobileMenuOpen` 状态
- 使用 `lg:hidden` 隐藏桌面侧边栏
- 使用 `fixed inset-0` 创建全屏抽屉
- 添加滑动动画 `transform translate-x`

#### 1.2.2 日历页面移动端适配

**当前问题**：工具栏按钮过小，视图切换不友好

**方案**：
```
移动端布局：
├── 顶部工具栏（垂直堆叠）
│   ├── 月份导航（← 2026年3月 →）
│   ├── 视图切换（横向滚动 tabs）
│   └── 项目筛选（下拉选择）
├── 日历内容区
│   ├── 月视图：保持7列，缩小单元格
│   ├── 周视图：改为列表形式
│   └── 日视图：全屏单日展示
```

**实现要点**：
- 工具栏使用 `flex-col sm:flex-row`
- 视图切换使用 `overflow-x-auto`
- 按钮尺寸：`px-2 py-1.5 sm:px-3 sm:py-2`

#### 1.2.3 通用响应式规范

```css
/* 断点定义 */
sm: 640px   /* 手机横屏 */
md: 768px   /* 平板竖屏 */
lg: 1024px  /* 平板横屏/小型笔记本 */
xl: 1280px  /* 桌面 */

/* 间距规范 */
移动端: p-3, p-4, gap-3
桌面端: p-5, p-6, gap-4, gap-6

/* 字体规范 */
标题: text-lg sm:text-xl md:text-2xl
正文: text-sm sm:text-base
辅助: text-xs sm:text-sm

/* 触摸目标 */
最小点击区域: 44x44px (Apple HIG)
按钮最小: min-h-[44px]
```

---

## 2. 项目和任务删除功能

### 2.1 当前状态分析

**项目删除**：
- ✅ API: `deleteProject()` - 软删除
- ✅ API: `permanentDeleteProject()` - 永久删除
- ✅ API: `restoreProject()` - 恢复删除
- ✅ Store: `deleteProject()` 方法
- ✅ 页面: `DeletedProjects.vue` 回收站
- ❌ UI: 项目列表缺少删除按钮

**任务删除**：
- ✅ API: `deleteTask()` - 软删除
- ✅ UI: `TaskDetail.vue` 有删除功能
- ❌ UI: 项目详情页任务列表缺少删除操作

### 2.2 设计方案

#### 2.2.1 项目列表删除功能

**位置**：`ProjectList.vue` 项目卡片

**交互设计**：
```
项目卡片
├── 悬停显示操作按钮（桌面端）
│   └── 删除图标（垃圾桶）
├── 长按或点击更多（移动端）
│   └── 弹出操作菜单
│       ├── 编辑
│       └── 删除
└── 删除确认弹窗
    ├── 标题: "确认删除项目？"
    ├── 警告: "项目将移入回收站，30天内可恢复"
    └── 按钮: [取消] [确认删除]
```

**代码实现**：
```vue
<!-- 项目卡片添加删除按钮 -->
<div class="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
  <button
    @click.stop="showDeleteConfirm(project)"
    class="p-2 bg-white/90 rounded-lg shadow hover:bg-red-50 hover:text-red-600"
  >
    <Trash2 class="w-4 h-4" />
  </button>
</div>
```

#### 2.2.2 项目详情页任务删除

**位置**：`ProjectDetail.vue` 任务列表

**交互设计**：
```
任务项
├── 悬停显示删除按钮
│   └── 删除图标
└── 点击删除 → 确认弹窗
    ├── 标题: "确认删除任务？"
    ├── 警告: "任务将移入归档"
    └── 按钮: [取消] [确认删除]
```

#### 2.2.3 导航入口优化

**添加回收站入口**：
- 侧边栏添加「已删除项目」链接
- 位置：项目列表下方或设置页面内

---

## 3. 页面数据关联和统计逻辑验证

### 3.1 需要验证的数据关系

#### 3.1.1 仪表盘统计 (DashboardPage.vue)

| 统计项 | 数据源 | 验证点 |
|--------|--------|--------|
| 今日待办 | `dashboard.todayTasks` | ✅ 后端计算当天到期任务 |
| 逾期任务 | `dashboard.overdueTasks` | ✅ 后端计算过期未完成任务 |
| 本周任务 | `dashboard.weekTasksCount` | ✅ 后端计算本周任务数 |
| 参与项目 | `dashboard.projectCount` | ✅ 后端计算用户参与项目数 |
| 月完成率 | `dashboard.monthStats.completionRate` | ✅ 后端计算当月完成比例 |

**验证方法**：
1. 检查 `server/src/controllers/dashboardController.ts`
2. 验证 SQL 查询逻辑
3. 确认时区处理正确

#### 3.1.2 项目详情页统计 (ProjectDetail.vue)

| 统计项 | 当前状态 | 改进建议 |
|--------|----------|----------|
| 任务数量 | ✅ 显示任务列表 | 添加统计摘要 |
| 成员数量 | ✅ 显示成员列表 | 添加计数徽章 |
| 完成进度 | ❌ 缺失 | 添加进度条 |

**改进方案**：
```vue
<!-- 添加任务统计摘要 -->
<div class="flex items-center gap-4 text-sm text-gray-500 mb-4">
  <span>共 {{ taskStats.total }} 个任务</span>
  <span>已完成 {{ taskStats.done }}</span>
  <span>进行中 {{ taskStats.inProgress }}</span>
</div>
```

#### 3.1.3 日历页面数据

| 数据项 | 关联关系 | 验证点 |
|--------|----------|--------|
| 任务显示 | 任务 → 日期 | ✅ 按 dueDate 过滤 |
| 项目筛选 | 任务 → 项目 | ✅ 按 projectId 过滤 |
| 分类颜色 | 任务 → 分类 | ✅ 使用 category.color |

### 3.2 测试计划

```
测试用例：
1. 仪表盘统计
   - 创建今日任务 → 今日待办 +1
   - 完成任务 → 完成率更新
   - 加入新项目 → 参与项目 +1

2. 项目详情页
   - 创建任务 → 任务列表更新
   - 删除任务 → 任务数量减少
   - 邀请成员 → 成员列表更新

3. 日历页面
   - 切换月份 → 任务正确显示
   - 筛选项目 → 只显示该项目任务
   - 任务拖拽 → 日期更新
```

---

## 4. 人员管理页面和逻辑

### 4.1 当前状态分析

**已有功能**：
- ✅ 部门管理页面 `/admin/departments`（系统管理员）
  - 创建/编辑/删除部门
  - 指定部门管理员
  - 查看成员数和项目数

- ✅ 我的部门页面 `/my-department`（部门管理员）
  - 查看部门成员
  - 添加/移除成员
  - 查看部门项目

**缺失功能**：
- ❌ 普通用户查看自己所属部门
- ❌ 系统管理员查看所有用户
- ❌ 导航入口不明确

### 4.2 设计方案

#### 4.2.1 导航结构优化

**侧边栏菜单**：
```
概览
日历
项目
├── 项目列表
└── 已删除项目
报告
设置

系统管理（仅管理员可见）
├── 部门管理
└── 用户管理

我的部门（仅部门管理员可见）
```

#### 4.2.2 用户管理页面（新增）

**路由**：`/admin/users`

**功能**：
- 查看所有用户列表
- 搜索用户
- 查看用户详情（所属部门、参与项目）
- 修改用户角色（可选）

**页面设计**：
```
用户管理
├── 搜索栏
│   └── 按邮箱/昵称搜索
├── 筛选
│   ├── 按部门筛选
│   └── 按角色筛选
└── 用户列表
    ├── 头像
    ├── 昵称
    ├── 邮箱
    ├── 所属部门
    ├── 角色
    └── 操作（查看详情）
```

#### 4.2.3 普通用户部门信息

**位置**：设置页面添加「部门信息」区块

```vue
<!-- SettingsPage.vue 添加部门信息 -->
<div class="bg-white rounded-lg border p-4">
  <h3 class="font-semibold mb-3">部门信息</h3>
  <div v-if="userDepartment">
    <p class="text-gray-800">{{ userDepartment.name }}</p>
    <p class="text-sm text-gray-500">{{ userDepartment.description }}</p>
  </div>
  <p v-else class="text-gray-500">您尚未加入任何部门</p>
</div>
```

---

## 5. 实施优先级

### P0 - 立即实施
1. 项目列表添加删除按钮
2. 侧边栏移动端折叠
3. 导航添加回收站入口

### P1 - 近期实施
1. 日历页面移动端优化
2. 项目详情页添加任务删除
3. 设置页面显示部门信息

### P2 - 后续优化
1. 用户管理页面
2. 项目详情页统计改进
3. 数据关联测试用例

---

## 6. 技术实现要点

### 6.1 移动端检测
```typescript
// composables/useIsMobile.ts
import { ref, onMounted, onUnmounted } from 'vue'

export function useIsMobile() {
  const isMobile = ref(false)

  function checkMobile() {
    isMobile.value = window.innerWidth < 768
  }

  onMounted(() => {
    checkMobile()
    window.addEventListener('resize', checkMobile)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', checkMobile)
  })

  return isMobile
}
```

### 6.2 删除确认组件
```vue
<!-- components/common/DeleteConfirmDialog.vue -->
<template>
  <div v-if="show" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-2xl w-full max-w-sm p-6 animate-scale-in">
      <div class="text-center mb-4">
        <div class="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <AlertTriangle class="w-6 h-6 text-red-600" />
        </div>
        <h3 class="text-lg font-semibold">{{ title }}</h3>
        <p class="text-gray-500 text-sm mt-2">{{ message }}</p>
      </div>
      <div class="flex gap-3">
        <button @click="$emit('cancel')" class="flex-1 py-2.5 border rounded-xl">
          取消
        </button>
        <button
          @click="$emit('confirm')"
          :disabled="loading"
          class="flex-1 py-2.5 bg-red-600 text-white rounded-xl"
        >
          {{ loading ? '删除中...' : '确认删除' }}
        </button>
      </div>
    </div>
  </div>
</template>
```

---

## 7. 风险和注意事项

1. **删除操作**：必须使用软删除，保留数据恢复能力
2. **权限控制**：删除操作需要验证用户权限
3. **移动端性能**：避免过多的响应式监听，使用防抖处理
4. **数据一致性**：删除项目时需处理关联任务的显示
5. **用户体验**：删除操作需要明确的确认流程

---

*文档版本: 1.0*
*创建日期: 2026-03-10*
*作者: Claude Code*
