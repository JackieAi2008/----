# 部门与人员管理增强设计

> 日期：2026-03-11
> 状态：已批准
> 方案：增强型仪表盘

## 1. 背景与目标

### 1.1 当前问题
- 部门和人员管理页面数据独立，缺乏关联
- 系统管理员无法快速了解全局数据
- 部门管理员无法查看成员工作负载和项目进度
- 普通用户无法了解部门整体情况

### 1.2 设计目标
- 增强数据关联展示：部门任务统计、成员工作负载、全局数据总览、部门项目进度
- 完善管理界面：部门项目管理、部门任务管理、成员日历查看、超管全局管理
- 保持部门+项目双轨制的混合模式

## 2. API 设计

### 2.1 部门仪表盘 API

**端点：** `GET /api/departments/:id/dashboard`

**权限：** 系统管理员、本部门成员

**返回结构：**
```json
{
  "success": true,
  "data": {
    "department": {
      "id": "string",
      "name": "string",
      "description": "string",
      "adminId": "string"
    },
    "statistics": {
      "tasks": {
        "todo": 0,
        "inProgress": 0,
        "done": 0,
        "cancelled": 0,
        "overdue": 0
      },
      "projects": {
        "active": 0,
        "completed": 0
      },
      "members": {
        "total": 0,
        "activeThisWeek": 0
      }
    },
    "members": [
      {
        "id": "string",
        "nickname": "string",
        "avatar": "string",
        "workload": {
          "total": 0,
          "todo": 0,
          "inProgress": 0,
          "done": 0
        }
      }
    ],
    "projects": [
      {
        "id": "string",
        "name": "string",
        "progress": 0,
        "taskCount": 0
      }
    ],
    "recentTasks": [
      {
        "id": "string",
        "title": "string",
        "status": "string",
        "dueDate": "string",
        "assignee": {
          "id": "string",
          "nickname": "string"
        }
      }
    ]
  }
}
```

### 2.2 系统管理仪表盘 API

**端点：** `GET /api/admin/dashboard`

**权限：** 系统管理员

**返回结构：**
```json
{
  "success": true,
  "data": {
    "overview": {
      "departments": 0,
      "users": 0,
      "projects": 0,
      "tasks": 0,
      "tasksByStatus": {
        "todo": 0,
        "inProgress": 0,
        "done": 0,
        "cancelled": 0
      }
    },
    "departments": [
      {
        "id": "string",
        "name": "string",
        "memberCount": 0,
        "projectCount": 0,
        "taskStats": {
          "todo": 0,
          "inProgress": 0,
          "done": 0
        }
      }
    ]
  }
}
```

### 2.3 成员详情 API

**端点：** `GET /api/departments/:id/members/:userId`

**权限：** 系统管理员、本部门成员

**返回结构：**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "string",
      "nickname": "string",
      "email": "string",
      "avatar": "string"
    },
    "tasks": [
      {
        "id": "string",
        "title": "string",
        "status": "string",
        "priority": "string",
        "dueDate": "string",
        "project": {
          "id": "string",
          "name": "string"
        }
      }
    ],
    "calendar": {
      "dates": [
        {
          "date": "2024-03-15",
          "taskCount": 3,
          "tasks": []
        }
      ]
    }
  }
}
```

## 3. 权限矩阵

| 功能 | 超级管理员 | 部门管理员 | 普通用户 |
|------|:----------:|:----------:|:--------:|
| 查看全局仪表盘 | ✅ | ❌ | ❌ |
| 创建/删除部门 | ✅ | ❌ | ❌ |
| 更换部门管理员 | ✅ | ❌ | ❌ |
| 查看本部门仪表盘 | ✅ | ✅ | ✅ |
| 查看部门成员列表 | ✅ | ✅ | ✅ |
| 查看成员日历 | ✅ | ✅ | ✅ |
| 添加/移除部门成员 | ✅ | ✅ | ❌ |
| 在部门内创建项目 | ✅ | ✅ | ❌ |
| 管理部门内所有项目 | ✅ | ✅ | ❌ |
| 创建任务 | ✅ | ✅ | ✅ |
| 分配任务给他人 | ✅ | ✅ | ✅* |

\* 普通用户仅限在自己参与的项目中分配任务

## 4. 前端界面设计

### 4.1 系统管理员仪表盘 (`/admin/departments`)

**改造内容：**
- 顶部添加统计卡片：部门数、用户数、项目数、任务数
- 部门列表增加任务进度列
- 使用进度条可视化展示

### 4.2 部门管理员仪表盘 (`/my-department`)

**改造内容：**
- 添加任务统计卡片：待办、进行中、已完成、逾期
- 添加成员工作负载区块（图表展示）
- 添加项目进度区块（进度条展示）
- 添加快捷操作按钮

### 4.3 成员日历视图 (`/my-department/members/:userId/calendar`)

**新增页面：**
- 日历形式展示成员任务分布
- 点击日期可查看当天任务详情
- 逾期任务高亮显示

## 5. 实现清单

### 5.1 后端改动

```
server/src/
├── controllers/
│   ├── departmentController.ts  # 添加 dashboard、memberDetail 方法
│   └── adminController.ts       # 新建，处理全局仪表盘
├── routes/
│   ├── departments.ts           # 添加新路由
│   └── admin.ts                 # 新建，管理路由
└── services/
    └── statisticsService.ts     # 新建，统计计算服务
```

### 5.2 前端改动

```
client/src/
├── views/
│   ├── admin/
│   │   └── DepartmentManage.vue # 改造，添加统计卡片
│   ├── department/
│   │   ├── MyDepartment.vue     # 改造，添加工作负载和项目进度
│   │   └── MemberCalendar.vue   # 新建，成员日历视图
│   └── dashboard/
│       └── DashboardPage.vue    # 改造，添加部门信息入口
├── components/
│   ├── StatisticsCard.vue       # 新建，统计卡片组件
│   ├── WorkloadChart.vue        # 新建，工作负载图表
│   └── ProgressBar.vue          # 新建，进度条组件
└── api/
    └── dashboard.ts             # 新建，仪表盘 API
```

## 6. 验收标准

- [ ] 系统管理员可查看全局数据总览
- [ ] 系统管理员可在部门列表中看到任务进度
- [ ] 部门管理员可查看部门任务统计
- [ ] 部门管理员可查看成员工作负载
- [ ] 部门管理员可查看项目进度
- [ ] 普通用户可查看本部门仪表盘
- [ ] 普通用户可查看成员日历
- [ ] 普通用户可在参与的项目中分配任务
