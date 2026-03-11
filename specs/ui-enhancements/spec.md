# UI Enhancements Spec

## Goal

优化协同日历项目的UI，实现移动端自适应显示，添加删除功能，验证数据统计逻辑，完善人员管理页面。**关键约束：不改变现有结构和布局。**

---

## Completion Signals

完成后必须满足以下所有条件：

- [ ] **移动端自适应**：所有页面在 375px 和 768px 宽度下正常显示
- [ ] **侧边栏正常**：桌面端默认显示侧边栏，移动端可折叠
- [ ] **项目删除**：ProjectList.vue 项目卡片有删除按钮，点击后弹出确认框
- [ ] **任务删除**：ProjectDetail.vue 任务列表项有删除按钮
- [ ] **回收站入口**：侧边栏有「回收站」导航链接
- [ ] **部门信息**：SettingsPage.vue 显示用户所属部门
- [ ] **构建成功**：`npm run build` 无错误通过

---

## Tasks

### Task 1: 修复侧边栏响应式显示

**Problem**: 侧边栏在桌面端默认隐藏

**File**: `client/src/layouts/MainLayout.vue`

**Fix**: 确保使用正确的响应式类
```vue
:class="{ '-translate-x-full md:translate-x-0': !sidebarOpen }"
```

**Verify**: 桌面端(>768px)侧边栏默认可见，移动端(<768px)默认隐藏，点击汉堡菜单可切换

---

### Task 2: 项目列表添加删除功能

**Files**:
- `client/src/views/project/ProjectList.vue`

**Requirements**:
1. 项目卡片悬停时显示删除按钮（垃圾桶图标）
2. 点击删除按钮弹出确认对话框
3. 确认后调用 `projectStore.deleteProject(id)`
4. 删除成功后刷新列表

**Code Pattern**:
```vue
<!-- 删除按钮 -->
<button
  @click.stop="confirmDelete(project)"
  class="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
>
  <Trash2 class="w-4 h-4" />
</button>

<!-- 确认对话框 -->
<div v-if="showDeleteConfirm" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
  <!-- dialog content -->
</div>
```

---

### Task 3: 项目详情页添加任务删除

**Files**:
- `client/src/views/project/ProjectDetail.vue`

**Requirements**:
1. 任务列表项悬停显示删除按钮
2. 点击弹出确认对话框
3. 确认后调用 `deleteTask(taskId)`
4. 删除成功后刷新任务列表

**Already Implemented**: 检查是否已有，如有则验证功能正常

---

### Task 4: 侧边栏添加回收站入口

**Files**:
- `client/src/layouts/MainLayout.vue`

**Requirements**:
1. 在「项目」导航项下方添加「回收站」链接
2. 路由: `/projects/deleted`
3. 图标: `Trash2`
4. 移动端和桌面端都可见

---

### Task 5: 设置页面显示部门信息

**Files**:
- `client/src/views/settings/SettingsPage.vue`

**Requirements**:
1. 添加「部门信息」卡片区块
2. 显示用户所属部门名称和描述
3. 如果用户未加入部门，显示「未加入部门」
4. 使用 `useDepartmentStore` 获取部门数据

**Code Pattern**:
```vue
<div class="bg-white rounded-lg border p-4">
  <h3 class="font-semibold mb-3 flex items-center gap-2">
    <Building2 class="w-5 h-5" />
    部门信息
  </h3>
  <div v-if="userDepartment">
    <p class="font-medium">{{ userDepartment.name }}</p>
    <p class="text-sm text-gray-500">{{ userDepartment.description }}</p>
  </div>
  <p v-else class="text-gray-500">您尚未加入任何部门</p>
</div>
```

---

### Task 6: 日历页面移动端优化

**Files**:
- `client/src/views/calendar/CalendarPage.vue`

**Requirements**:
1. 工具栏在移动端垂直堆叠 (`flex-col sm:flex-row`)
2. 视图切换按钮在移动端可横向滚动
3. 按钮尺寸响应式: `px-2 py-1.5 sm:px-3 sm:py-2`
4. 月份导航适配移动端

---

### Task 7: 验证构建和功能

**Requirements**:
1. 运行 `npm run build` 确保无 TypeScript 错误
2. 运行 `npm run dev` 手动验证：
   - 侧边栏桌面端可见
   - 侧边栏移动端可切换
   - 项目删除功能正常
   - 任务删除功能正常
   - 回收站入口可见
   - 部门信息显示正常

---

## Technical Constraints

1. **禁止改变现有布局结构** - 只添加功能，不重新设计
2. **使用软删除** - 所有删除操作调用现有 API，不新增后端
3. **响应式断点** - 使用 Tailwind 默认断点 (sm:640px, md:768px)
4. **图标库** - 使用 lucide-vue-next，不引入新图标库

---

## Files to Modify

| File | Changes |
|------|---------|
| `client/src/layouts/MainLayout.vue` | 修复侧边栏、添加回收站入口 |
| `client/src/views/project/ProjectList.vue` | 添加删除功能 |
| `client/src/views/project/ProjectDetail.vue` | 验证任务删除 |
| `client/src/views/settings/SettingsPage.vue` | 添加部门信息 |
| `client/src/views/calendar/CalendarPage.vue` | 移动端优化 |

---

*Spec Version: 1.0*
*Created: 2026-03-10*
