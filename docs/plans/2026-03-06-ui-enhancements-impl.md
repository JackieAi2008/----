# UI 增强功能实现计划
> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现三个 UI 增强功能

**Architecture:** Vue 3 组件化开发，使用 Composition API

**Tech Stack:** Vue 3, TypeScript, Tailwind CSS, Lucide Icons

---

## Task 1: 概览页面 - 创建可展开统计卡片组件

**Files:**
- Create: client/src/components/dashboard/ExpandableStatCard.vue
- Modify: client/src/views/dashboard/DashboardPage.vue

创建 ExpandableStatCard.vue 组件，支持：
- 显示统计数字和图标
- 点击展开显示内容列表（最多3条）
- 手风琴效果
- 查看全部链接

Props: title, count, icon. iconBgClass. iconClass. countClass. items. emptyText
Events: itemClick. viewAll

---

## Task 2: 概览页面 - 重构 DashboardPage

**Files:**
- Modify: client/src/views/dashboard/DashboardPage.vue

将四个统计卡片替换为 ExpandableStatCard 组件。
添加手风琴效果控制逻辑。
删除下方的重复任务列表区域。

---

## Task 3: 日历页面 - 月视图点击创建

**Files:**
- Modify: client/src/views/calendar/CalendarPage.vue

添加月视图日期点击处理：
- 点击日期格子空白区域
- 弹出 TaskForm 并预设日期为当天 18:00

---

## Task 4: 日历页面 - 周/日视图点击创建

**Files:**
- Modify: client/src/views/calendar/CalendarPage.vue

添加周/日视图时间格子点击处理：
- 点击时间格子
- 弹出 TaskForm 并预设开始/截止时间

---

## Task 5: 日历页面 - 年视图点击创建

**Files:**
- Modify: client/src/views/calendar/CalendarPage.vue

添加年视图日期点击处理：
- 点击日期数字
- 弹出 TaskForm 并预设日期

---

## Task 6: 任务表单 - 添加新建项目按钮

**Files:**
- Modify: client/src/components/task/TaskForm.vue

在项目选择器旁添加 + 按钮。点击弹出快速创建项目对话框。

---

## Task 7: 任务表单 - 创建快速创建项目对话框

**Files:**
- Create: client/src/components/project/QuickCreateProjectDialog.vue

创建项目快速创建对话框：
- 项目名称（必填）
- 项目描述（可选）
- 可见性（公开/私密）
- 成员搜索和选择
- 创建成功后返回项目ID

---

## Task 8: 任务表单 - 集成快速创建对话框

**Files:**
- Modify: client/src/components/task/TaskForm.vue

导入 QuickCreateProjectDialog。
处理创建成功事件。
自动选中新项目。

---

## Task 9: 最终验证

运行 npm run build 验证构建。
手动测试三个功能。
提交代码。

---

## 验收标准

- 概览页面四个卡片可点击展开
- 同一时间只能展开一个卡片
- 日历各视图点击空白区域可创建任务
- 任务表单有新建项目按钮
- 项目创建对话框支持成员选择
- 创建后自动选中新项目
