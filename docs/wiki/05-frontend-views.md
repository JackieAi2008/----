# 05 前端视图与组件

> 来源:`client/src/views/`、`client/src/components/`、`client/src/router/index.ts`、`client/src/layouts/MainLayout.vue`。

## 视图(views)
- 概览:`views/dashboard/DashboardPage.vue`
- 日历:`views/calendar/CalendarPage.vue`(月/周/日三视图)
- 项目:
  - `views/project/ProjectList.vue`
  - `views/project/ProjectDetail.vue`(image1、image2 的来源页)
  - `views/project/DeletedProjects.vue`
- 任务:
  - `views/task/TaskDetail.vue`
  - `views/task/ArchivedTasks.vue`
- 部门:
  - `views/department/MyDepartment.vue`
  - `views/department/MemberCalendar.vue`
- 管理:
  - `views/admin/UserManage.vue`
  - `views/admin/DepartmentManage.vue`
- 报表/搜索/设置:
  - `views/reports/ReportsPage.vue`
  - `views/search/SearchResult.vue`
  - `views/settings/SettingsPage.vue`
- 认证:
  - `views/auth/Login.vue`
  - `views/auth/Register.vue`
  - `views/auth/ForgotPassword.vue`

## 关键组件
- 通用:`common/NavItem.vue`、`common/GlobalSearch.vue`、`common/NotificationPanel.vue`、`common/ToastContainer.vue`、`common/ShortcutHelp.vue`、`common/FabButton.vue`、`common/ExportDialog.vue`
- 任务:`task/TaskForm.vue`、`task/CompleteTaskDialog.vue`、`task/TaskTemplateDialog.vue`、`task/TemplateList.vue`
- 项目:`project/QuickCreateProjectDialog.vue`
- 日历辅助:`calendar/DatePickerDropdown.vue`
- 设置:`settings/PushSettings.vue`
- 统计:`components/StatisticsCard.vue`、`ProgressBar.vue`、`dashboard/ExpandableStatCard.vue`

## 路由
- 见 `client/src/router/index.ts`,主要前缀:`/dashboard`、`/calendar`、`/projects`、`/projects/:id`、`/tasks/:id`、`/admin/users`、`/admin/departments`、`/reports`、`/search`、`/settings`

## 状态管理
- `stores/auth.ts`(含 `auth.test.ts` 单测)
- `stores/project.ts`、`stores/department.ts`、`stores/notification.ts`
- API 层:`api/*.ts`,与后端路由 1:1
