# 中集智历 API接口设计

> 版本：1.0.0
> 更新日期：2026年3月1日

---

## 一、接口规范

### 1.1 基础信息

| 项目 | 说明 |
|------|------|
| 基础URL | /api/v1 |
| 数据格式 | JSON |
| 字符编码 | UTF-8 |
| 时间格式 | ISO 8601 (YYYY-MM-DDTHH:mm:ss.sssZ) |

### 1.2 请求头

| 请求头 | 必填 | 说明 |
|--------|------|------|
| Content-Type | ✅ | application/json |
| Authorization | ✅ | Bearer {token}（需认证的接口） |

### 1.3 响应格式

#### 成功响应

```json
{
  "success": true,
  "data": { ... },
  "message": "操作成功"
}
```

#### 错误响应

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述",
    "details": { ... }
  }
}
```

### 1.4 分页格式

```json
{
  "success": true,
  "data": {
    "items": [ ... ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

### 1.5 错误码

| 错误码 | HTTP状态码 | 说明 |
|--------|------------|------|
| UNAUTHORIZED | 401 | 未登录或Token无效 |
| FORBIDDEN | 403 | 无权限访问 |
| NOT_FOUND | 404 | 资源不存在 |
| VALIDATION_ERROR | 400 | 参数验证失败 |
| DUPLICATE_ERROR | 409 | 资源已存在 |
| INTERNAL_ERROR | 500 | 服务器内部错误 |

---

## 二、认证接口

### 2.1 用户注册

**POST** /api/v1/auth/register

**请求体**：
```json
{
  "email": "user@example.com",
  "password": "Password123!",
  "nickname": "张三",
  "securityQuestion": 0,
  "securityAnswer": "李华"
}
```

**参数说明**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| email | string | ✅ | 邮箱地址 |
| password | string | ✅ | 密码（6-20位，需包含字母和数字） |
| nickname | string | ✅ | 昵称（2-20字符） |
| securityQuestion | number | ✅ | 安全问题序号（0-3） |
| securityAnswer | string | ✅ | 安全问题答案 |

**响应**：
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "nickname": "张三",
      "avatar": null,
      "createdAt": "2026-03-01T00:00:00.000Z"
    },
    "token": "jwt_token_string"
  },
  "message": "注册成功"
}
```

### 2.2 用户登录

**POST** /api/v1/auth/login

**请求体**：
```json
{
  "email": "user@example.com",
  "password": "Password123!"
}
```

**响应**：
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "nickname": "张三",
      "avatar": "https://...",
      "bio": "个人简介",
      "isAdmin": false
    },
    "token": "jwt_token_string"
  },
  "message": "登录成功"
}
```

### 2.3 获取安全问题

**POST** /api/v1/auth/security-question

**请求体**：
```json
{
  "email": "user@example.com"
}
```

**响应**：
```json
{
  "success": true,
  "data": {
    "questionIndex": 0,
    "question": "您的母亲姓名是什么？"
  }
}
```

### 2.4 验证安全问题并重置密码

**POST** /api/v1/auth/reset-password

**请求体**：
```json
{
  "email": "user@example.com",
  "securityAnswer": "李华",
  "newPassword": "NewPassword123!"
}
```

**响应**：
```json
{
  "success": true,
  "message": "密码重置成功"
}
```

### 2.5 获取当前用户信息

**GET** /api/v1/auth/me

**请求头**：需要Authorization

**响应**：
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "nickname": "张三",
    "avatar": "https://...",
    "bio": "个人简介",
    "isAdmin": false,
    "createdAt": "2026-03-01T00:00:00.000Z"
  }
}
```

### 2.6 退出登录

**POST** /api/v1/auth/logout

**请求头**：需要Authorization

**响应**：
```json
{
  "success": true,
  "message": "退出成功"
}
```

---

## 三、用户接口

### 3.1 更新用户信息

**PUT** /api/v1/users/profile

**请求头**：需要Authorization

**请求体**：
```json
{
  "nickname": "新昵称",
  "avatar": "base64_string_or_url",
  "bio": "新的个人简介"
}
```

**响应**：
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "nickname": "新昵称",
    "avatar": "https://...",
    "bio": "新的个人简介"
  },
  "message": "更新成功"
}
```

### 3.2 修改密码

**PUT** /api/v1/users/password

**请求头**：需要Authorization

**请求体**：
```json
{
  "oldPassword": "OldPassword123!",
  "newPassword": "NewPassword123!"
}
```

**响应**：
```json
{
  "success": true,
  "message": "密码修改成功"
}
```

### 3.3 搜索用户

**GET** /api/v1/users/search?keyword={keyword}

**请求头**：需要Authorization

**查询参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| keyword | string | ✅ | 搜索关键词（邮箱或昵称） |
| page | number | ❌ | 页码，默认1 |
| pageSize | number | ❌ | 每页数量，默认20 |

**响应**：
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "nickname": "张三",
        "avatar": "https://...",
        "email": "zhang@example.com"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

### 3.4 获取用户详情

**GET** /api/v1/users/:id

**请求头**：需要Authorization

**响应**：
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "nickname": "张三",
    "avatar": "https://...",
    "bio": "个人简介",
    "createdAt": "2026-03-01T00:00:00.000Z"
  }
}
```

---

## 四、项目接口

### 4.1 获取项目列表

**GET** /api/v1/projects

**请求头**：需要Authorization

**查询参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | string | ❌ | 类型：my（我参与的）/ public（公开的）/ all（全部，仅管理员） |
| page | number | ❌ | 页码，默认1 |
| pageSize | number | ❌ | 每页数量，默认20 |

**响应**：
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "name": "2026年度党建工作",
        "description": "项目描述",
        "cover": "https://...",
        "visibility": "PUBLIC",
        "owner": {
          "id": "uuid",
          "nickname": "张三",
          "avatar": "https://..."
        },
        "memberCount": 5,
        "taskCount": 20,
        "createdAt": "2026-03-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 10,
      "totalPages": 1
    }
  }
}
```

### 4.2 搜索公开项目

**GET** /api/v1/projects/search?keyword={keyword}

**请求头**：需要Authorization

**查询参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| keyword | string | ✅ | 搜索关键词 |
| page | number | ❌ | 页码，默认1 |
| pageSize | number | ❌ | 每页数量，默认20 |

**响应**：同项目列表

### 4.3 创建项目

**POST** /api/v1/projects

**请求头**：需要Authorization

**请求体**：
```json
{
  "name": "2026年度党建工作",
  "description": "项目描述",
  "cover": "base64_string_or_url",
  "visibility": "PUBLIC"
}
```

**响应**：
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "2026年度党建工作",
    "description": "项目描述",
    "cover": "https://...",
    "visibility": "PUBLIC",
    "owner": {
      "id": "uuid",
      "nickname": "张三"
    },
    "createdAt": "2026-03-01T00:00:00.000Z"
  },
  "message": "项目创建成功"
}
```

### 4.4 获取项目详情

**GET** /api/v1/projects/:id

**请求头**：需要Authorization

**响应**：
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "2026年度党建工作",
    "description": "项目描述",
    "cover": "https://...",
    "visibility": "PUBLIC",
    "owner": {
      "id": "uuid",
      "nickname": "张三",
      "avatar": "https://..."
    },
    "myRole": "MEMBER",
    "members": [
      {
        "id": "uuid",
        "nickname": "张三",
        "avatar": "https://...",
        "role": "OWNER",
        "joinedAt": "2026-03-01T00:00:00.000Z"
      }
    ],
    "categories": [
      {
        "id": "uuid",
        "name": "党建",
        "color": "#E74C3C"
      }
    ],
    "stats": {
      "totalTasks": 20,
      "completedTasks": 10,
      "overdueTasks": 2
    },
    "createdAt": "2026-03-01T00:00:00.000Z"
  }
}
```

### 4.5 更新项目信息

**PUT** /api/v1/projects/:id

**请求头**：需要Authorization（仅项目负责人）

**请求体**：
```json
{
  "name": "新项目名称",
  "description": "新描述",
  "cover": "base64_string_or_url",
  "visibility": "PRIVATE"
}
```

**响应**：
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "新项目名称",
    "description": "新描述",
    "visibility": "PRIVATE"
  },
  "message": "项目更新成功"
}
```

### 4.6 删除项目

**DELETE** /api/v1/projects/:id

**请求头**：需要Authorization（仅项目负责人）

**响应**：
```json
{
  "success": true,
  "message": "项目已删除，30天内可恢复"
}
```

### 4.7 恢复已删除项目

**POST** /api/v1/projects/:id/restore

**请求头**：需要Authorization（仅项目负责人）

**响应**：
```json
{
  "success": true,
  "message": "项目已恢复"
}
```

### 4.8 移交项目负责人

**POST** /api/v1/projects/:id/transfer

**请求头**：需要Authorization（仅项目负责人）

**请求体**：
```json
{
  "newOwnerId": "uuid"
}
```

**响应**：
```json
{
  "success": true,
  "message": "项目负责人已移交"
}
```

---

## 五、项目成员接口

### 5.1 获取项目成员列表

**GET** /api/v1/projects/:projectId/members

**请求头**：需要Authorization

**响应**：
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "nickname": "张三",
        "avatar": "https://...",
        "email": "zhang@example.com",
        "role": "OWNER",
        "joinedAt": "2026-03-01T00:00:00.000Z"
      }
    ]
  }
}
```

### 5.2 申请加入项目

**POST** /api/v1/projects/:projectId/join

**请求头**：需要Authorization

**响应**：
```json
{
  "success": true,
  "message": "申请已提交，等待项目负责人审批"
}
```

### 5.3 邀请成员加入项目

**POST** /api/v1/projects/:projectId/invite

**请求头**：需要Authorization

**请求体**：
```json
{
  "userId": "uuid"
}
```

**响应**：

对于项目负责人：
```json
{
  "success": true,
  "message": "成员已添加"
}
```

对于普通成员：
```json
{
  "success": true,
  "message": "邀请申请已提交，等待项目负责人审批"
}
```

### 5.4 获取待审批的邀请/申请列表

**GET** /api/v1/projects/:projectId/pending-invites

**请求头**：需要Authorization（仅项目负责人）

**响应**：
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "invitee": {
          "id": "uuid",
          "nickname": "李四",
          "avatar": "https://..."
        },
        "inviter": {
          "id": "uuid",
          "nickname": "张三"
        },
        "createdAt": "2026-03-01T00:00:00.000Z",
        "expiresAt": "2026-03-08T00:00:00.000Z"
      }
    ]
  }
}
```

### 5.5 审批邀请申请

**POST** /api/v1/projects/:projectId/approve-invite/:inviteId

**请求头**：需要Authorization（仅项目负责人）

**请求体**：
```json
{
  "approved": true
}
```

**响应**：
```json
{
  "success": true,
  "message": "已通过" // 或 "已拒绝"
}
```

### 5.6 移除项目成员

**DELETE** /api/v1/projects/:projectId/members/:userId

**请求头**：需要Authorization（仅项目负责人）

**响应**：
```json
{
  "success": true,
  "message": "成员已移除"
}
```

### 5.7 退出项目

**POST** /api/v1/projects/:projectId/leave

**请求头**：需要Authorization

**响应**：
```json
{
  "success": true,
  "message": "已退出项目"
}
```

---

## 六、任务接口

### 6.1 获取任务列表

**GET** /api/v1/projects/:projectId/tasks

**请求头**：需要Authorization

**查询参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| assigneeId | string | ❌ | 负责人ID |
| status | string | ❌ | 状态：TODO/IN_PROGRESS/DONE/CANCELLED |
| startDate | string | ❌ | 开始日期 |
| endDate | string | ❌ | 结束日期 |
| involved | boolean | ❌ | 只看我参与的 |
| overdue | boolean | ❌ | 只看逾期的 |
| keyword | string | ❌ | 搜索关键词 |
| page | number | ❌ | 页码，默认1 |
| pageSize | number | ❌ | 每页数量，默认20 |

**响应**：
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "title": "完成季度报告",
        "description": "任务描述",
        "startDate": "2026-03-01T00:00:00.000Z",
        "dueDate": "2026-03-15T18:00:00.000Z",
        "category": {
          "id": "uuid",
          "name": "行政",
          "color": "#2ECC71"
        },
        "assignee": {
          "id": "uuid",
          "nickname": "张三",
          "avatar": "https://..."
        },
        "collaborators": [
          {
            "id": "uuid",
            "nickname": "李四"
          }
        ],
        "priority": "HIGH",
        "status": "IN_PROGRESS",
        "tags": ["报告", "季度"],
        "creator": {
          "id": "uuid",
          "nickname": "张三"
        },
        "createdAt": "2026-03-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 50,
      "totalPages": 3
    }
  }
}
```

### 6.2 创建任务

**POST** /api/v1/projects/:projectId/tasks

**请求头**：需要Authorization

**请求体**：
```json
{
  "title": "完成季度报告",
  "description": "任务详细描述",
  "startDate": "2026-03-01T00:00:00.000Z",
  "dueDate": "2026-03-15T18:00:00.000Z",
  "categoryId": "uuid",
  "assigneeId": "uuid",
  "collaboratorIds": ["uuid", "uuid"],
  "priority": "HIGH",
  "deliverable": "季度报告文档",
  "tags": ["报告", "季度"],
  "reminder": "ONE_DAY",
  "repeat": null
}
```

**响应**：
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "完成季度报告",
    "status": "TODO",
    "createdAt": "2026-03-01T00:00:00.000Z"
  },
  "message": "任务创建成功"
}
```

### 6.3 获取任务详情

**GET** /api/v1/tasks/:id

**请求头**：需要Authorization

**响应**：
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "projectId": "uuid",
    "projectName": "2026年度党建工作",
    "title": "完成季度报告",
    "description": "任务详细描述",
    "startDate": "2026-03-01T00:00:00.000Z",
    "dueDate": "2026-03-15T18:00:00.000Z",
    "category": {
      "id": "uuid",
      "name": "行政",
      "color": "#2ECC71"
    },
    "assignee": {
      "id": "uuid",
      "nickname": "张三",
      "avatar": "https://..."
    },
    "collaborators": [
      {
        "id": "uuid",
        "nickname": "李四",
        "avatar": "https://..."
      }
    ],
    "priority": "HIGH",
    "status": "IN_PROGRESS",
    "deliverable": "季度报告文档",
    "tags": ["报告", "季度"],
    "reminder": "ONE_DAY",
    "repeat": null,
    "creator": {
      "id": "uuid",
      "nickname": "张三"
    },
    "attachments": [
      {
        "id": "uuid",
        "filename": "report.pdf",
        "size": 102400,
        "createdAt": "2026-03-01T00:00:00.000Z"
      }
    ],
    "commentCount": 5,
    "createdAt": "2026-03-01T00:00:00.000Z",
    "updatedAt": "2026-03-01T00:00:00.000Z"
  }
}
```

### 6.4 更新任务

**PUT** /api/v1/tasks/:id

**请求头**：需要Authorization

**请求体**：同创建任务，所有字段可选

**响应**：
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "更新后的标题"
  },
  "message": "任务更新成功"
}
```

### 6.5 更新任务状态

**PATCH** /api/v1/tasks/:id/status

**请求头**：需要Authorization

**请求体**：
```json
{
  "status": "DONE"
}
```

**响应**：
```json
{
  "success": true,
  "message": "状态已更新"
}
```

### 6.6 删除任务

**DELETE** /api/v1/tasks/:id

**请求头**：需要Authorization

**响应**：
```json
{
  "success": true,
  "message": "任务已删除"
}
```

### 6.7 获取我的任务（跨项目）

**GET** /api/v1/tasks/my

**请求头**：需要Authorization

**查询参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| status | string | ❌ | 状态筛选 |
| startDate | string | ❌ | 开始日期 |
| endDate | string | ❌ | 结束日期 |
| overdue | boolean | ❌ | 只看逾期的 |
| page | number | ❌ | 页码 |
| pageSize | number | ❌ | 每页数量 |

**响应**：同任务列表，但包含项目信息

---

## 七、评论接口

### 7.1 获取任务评论

**GET** /api/v1/tasks/:taskId/comments

**请求头**：需要Authorization

**查询参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | ❌ | 页码 |
| pageSize | number | ❌ | 每页数量 |

**响应**：
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "content": "这个任务进展如何？",
        "user": {
          "id": "uuid",
          "nickname": "张三",
          "avatar": "https://..."
        },
        "mentions": [
          {
            "id": "uuid",
            "nickname": "李四"
          }
        ],
        "replyTo": {
          "id": "uuid",
          "content": "原评论内容",
          "user": {
            "nickname": "王五"
          }
        },
        "images": ["https://..."],
        "createdAt": "2026-03-01T00:00:00.000Z"
      }
    ],
    "pagination": { ... }
  }
}
```

### 7.2 创建评论

**POST** /api/v1/tasks/:taskId/comments

**请求头**：需要Authorization

**请求体**：
```json
{
  "content": "@李四 这个任务进展如何？",
  "mentions": ["uuid"],
  "replyToId": "uuid",
  "images": ["base64_string"]
}
```

**响应**：
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "content": "@李四 这个任务进展如何？",
    "createdAt": "2026-03-01T00:00:00.000Z"
  },
  "message": "评论发布成功"
}
```

### 7.3 删除评论

**DELETE** /api/v1/comments/:id

**请求头**：需要Authorization

**响应**：
```json
{
  "success": true,
  "message": "评论已删除"
}
```

---

## 八、附件接口

### 8.1 上传附件

**POST** /api/v1/tasks/:taskId/attachments

**请求头**：需要Authorization，Content-Type: multipart/form-data

**请求体**：
```
file: [二进制文件]
```

**响应**：
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "filename": "report.pdf",
    "originalName": "季度报告.pdf",
    "size": 102400,
    "mimeType": "application/pdf",
    "url": "/api/v1/attachments/uuid/download"
  },
  "message": "上传成功"
}
```

### 8.2 获取附件列表

**GET** /api/v1/tasks/:taskId/attachments

**请求头**：需要Authorization

**响应**：
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "filename": "report.pdf",
        "originalName": "季度报告.pdf",
        "size": 102400,
        "mimeType": "application/pdf",
        "uploader": {
          "id": "uuid",
          "nickname": "张三"
        },
        "createdAt": "2026-03-01T00:00:00.000Z"
      }
    ]
  }
}
```

### 8.3 下载附件

**GET** /api/v1/attachments/:id/download

**请求头**：需要Authorization

**响应**：文件流

### 8.4 删除附件

**DELETE** /api/v1/attachments/:id

**请求头**：需要Authorization

**响应**：
```json
{
  "success": true,
  "message": "附件已删除"
}
```

---

## 九、通知接口

### 9.1 获取通知列表

**GET** /api/v1/notifications

**请求头**：需要Authorization

**查询参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| isRead | boolean | ❌ | 是否已读 |
| type | string | ❌ | 通知类型 |
| page | number | ❌ | 页码 |
| pageSize | number | ❌ | 每页数量 |

**响应**：
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "type": "TASK_ASSIGNED",
        "title": "新任务指派",
        "content": "张三将任务「完成季度报告」指派给了您",
        "relatedType": "TASK",
        "relatedId": "uuid",
        "isRead": false,
        "createdAt": "2026-03-01T00:00:00.000Z"
      }
    ],
    "unreadCount": 5,
    "pagination": { ... }
  }
}
```

### 9.2 标记通知为已读

**PATCH** /api/v1/notifications/:id/read

**请求头**：需要Authorization

**响应**：
```json
{
  "success": true,
  "message": "已标记为已读"
}
```

### 9.3 标记所有通知为已读

**POST** /api/v1/notifications/read-all

**请求头**：需要Authorization

**响应**：
```json
{
  "success": true,
  "message": "已全部标记为已读"
}
```

### 9.4 获取未读通知数量

**GET** /api/v1/notifications/unread-count

**请求头**：需要Authorization

**响应**：
```json
{
  "success": true,
  "data": {
    "count": 5
  }
}
```

---

## 十、任务类别接口

### 10.1 获取项目任务类别

**GET** /api/v1/projects/:projectId/categories

**请求头**：需要Authorization

**响应**：
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "name": "党建",
        "color": "#E74C3C",
        "isSystem": true
      },
      {
        "id": "uuid",
        "name": "自定义类别",
        "color": "#9B59B6",
        "isSystem": false
      }
    ]
  }
}
```

### 10.2 创建自定义类别

**POST** /api/v1/projects/:projectId/categories

**请求头**：需要Authorization（仅项目负责人）

**请求体**：
```json
{
  "name": "会议",
  "color": "#9B59B6"
}
```

**响应**：
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "会议",
    "color": "#9B59B6"
  },
  "message": "类别创建成功"
}
```

### 10.3 更新类别

**PUT** /api/v1/projects/:projectId/categories/:id

**请求头**：需要Authorization（仅项目负责人）

**请求体**：
```json
{
  "name": "新名称",
  "color": "#3498DB"
}
```

**响应**：
```json
{
  "success": true,
  "message": "类别更新成功"
}
```

### 10.4 删除类别

**DELETE** /api/v1/projects/:projectId/categories/:id

**请求头**：需要Authorization（仅项目负责人，不能删除系统类别）

**响应**：
```json
{
  "success": true,
  "message": "类别已删除"
}
```

---

## 十一、统计接口

### 11.1 获取仪表盘数据

**GET** /api/v1/dashboard

**请求头**：需要Authorization

**响应**：
```json
{
  "success": true,
  "data": {
    "todayTasks": [
      {
        "id": "uuid",
        "title": "今日任务",
        "dueDate": "2026-03-01T18:00:00.000Z",
        "project": {
          "id": "uuid",
          "name": "项目名称"
        }
      }
    ],
    "overdueTasks": [
      {
        "id": "uuid",
        "title": "逾期任务",
        "dueDate": "2026-02-28T18:00:00.000Z"
      }
    ],
    "upcomingTasks": [
      {
        "id": "uuid",
        "title": "即将到期",
        "dueDate": "2026-03-02T18:00:00.000Z"
      }
    ],
    "stats": {
      "totalTasks": 50,
      "completedTasks": 20,
      "overdueTasks": 3,
      "thisWeekCompleted": 8
    },
    "projects": [
      {
        "id": "uuid",
        "name": "项目名称",
        "role": "MEMBER",
        "taskCount": 10
      }
    ]
  }
}
```

### 11.2 获取个人统计

**GET** /api/v1/statistics/personal

**请求头**：需要Authorization

**查询参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| startDate | string | ❌ | 开始日期 |
| endDate | string | ❌ | 结束日期 |

**响应**：
```json
{
  "success": true,
  "data": {
    "totalTasks": 50,
    "completedTasks": 35,
    "overdueTasks": 5,
    "completionRate": 70,
    "byPriority": {
      "HIGH": { "total": 10, "completed": 8 },
      "MEDIUM": { "total": 30, "completed": 22 },
      "LOW": { "total": 10, "completed": 5 }
    },
    "byCategory": [
      { "name": "党建", "total": 15, "completed": 12 },
      { "name": "行政", "total": 20, "completed": 14 }
    ],
    "dailyTrend": [
      { "date": "2026-03-01", "completed": 3, "created": 5 },
      { "date": "2026-03-02", "completed": 4, "created": 2 }
    ]
  }
}
```

### 11.3 获取项目统计

**GET** /api/v1/projects/:projectId/statistics

**请求头**：需要Authorization

**查询参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| startDate | string | ❌ | 开始日期 |
| endDate | string | ❌ | 结束日期 |

**响应**：
```json
{
  "success": true,
  "data": {
    "totalTasks": 100,
    "completedTasks": 60,
    "overdueTasks": 5,
    "completionRate": 60,
    "byMember": [
      {
        "id": "uuid",
        "nickname": "张三",
        "avatar": "https://...",
        "totalTasks": 20,
        "completedTasks": 15
      }
    ],
    "byCategory": [
      { "name": "党建", "total": 30, "completed": 20 }
    ],
    "byStatus": {
      "TODO": 30,
      "IN_PROGRESS": 10,
      "DONE": 60,
      "CANCELLED": 0
    },
    "timeline": [
      { "date": "2026-03-01", "created": 5, "completed": 3 }
    ]
  }
}
```

### 11.4 生成工作总结

**GET** /api/v1/statistics/summary

**请求头**：需要Authorization

**查询参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | string | ✅ | 类型：week/month/quarter/year |
| projectId | string | ❌ | 项目ID（不传则为全部项目） |

**响应**：
```json
{
  "success": true,
  "data": {
    "period": "2026年2月",
    "summary": "本月共完成任务20项，完成率80%...",
    "tasks": {
      "total": 25,
      "completed": 20,
      "overdue": 2
    },
    "highlights": [
      "完成季度报告撰写",
      "组织团队建设活动"
    ],
    "categories": [
      { "name": "党建", "completed": 10 },
      { "name": "行政", "completed": 10 }
    ]
  }
}
```

---

## 十二、数据导出接口

### 12.1 导出任务为ICS

**GET** /api/v1/export/ics

**请求头**：需要Authorization

**查询参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| projectId | string | ❌ | 项目ID（不传则为全部） |
| startDate | string | ❌ | 开始日期 |
| endDate | string | ❌ | 结束日期 |

**响应**：ICS文件下载

### 12.2 导出任务为Excel

**GET** /api/v1/export/excel

**请求头**：需要Authorization

**查询参数**：同ICS

**响应**：Excel文件下载

### 12.3 导出工作总结PDF

**GET** /api/v1/export/pdf

**请求头**：需要Authorization

**查询参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | string | ✅ | 类型：week/month/quarter/year |
| projectId | string | ❌ | 项目ID |

**响应**：PDF文件下载

---

## 十三、管理员接口

### 13.1 获取平台统计

**GET** /api/v1/admin/statistics

**请求头**：需要Authorization（仅超级管理员）

**响应**：
```json
{
  "success": true,
  "data": {
    "totalUsers": 50,
    "activeUsers": 30,
    "totalProjects": 10,
    "totalTasks": 500,
    "newUsersToday": 2,
    "activeUsersToday": 15
  }
}
```

### 13.2 获取用户列表

**GET** /api/v1/admin/users

**请求头**：需要Authorization（仅超级管理员）

**查询参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| keyword | string | ❌ | 搜索关键词 |
| isBanned | boolean | ❌ | 是否封禁 |
| page | number | ❌ | 页码 |
| pageSize | number | ❌ | 每页数量 |

**响应**：用户列表

### 13.3 封禁/解封用户

**PATCH** /api/v1/admin/users/:id/ban

**请求头**：需要Authorization（仅超级管理员）

**请求体**：
```json
{
  "isBanned": true,
  "reason": "违规原因"
}
```

**响应**：
```json
{
  "success": true,
  "message": "用户已封禁"
}
```

### 13.4 获取所有项目

**GET** /api/v1/admin/projects

**请求头**：需要Authorization（仅超级管理员）

**响应**：项目列表

### 13.5 删除项目（管理员）

**DELETE** /api/v1/admin/projects/:id

**请求头**：需要Authorization（仅超级管理员）

**请求体**：
```json
{
  "reason": "违规原因"
}
```

**响应**：
```json
{
  "success": true,
  "message": "项目已删除"
}
```

### 13.6 获取操作日志

**GET** /api/v1/admin/audit-logs

**请求头**：需要Authorization（仅超级管理员）

**查询参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userId | string | ❌ | 用户ID |
| action | string | ❌ | 操作类型 |
| startDate | string | ❌ | 开始日期 |
| endDate | string | ❌ | 结束日期 |
| page | number | ❌ | 页码 |
| pageSize | number | ❌ | 每页数量 |

**响应**：
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "user": {
          "id": "uuid",
          "nickname": "张三"
        },
        "action": "TASK_CREATE",
        "targetType": "TASK",
        "targetId": "uuid",
        "details": { ... },
        "ipAddress": "192.168.1.1",
        "createdAt": "2026-03-01T00:00:00.000Z"
      }
    ],
    "pagination": { ... }
  }
}
```

---

## 十四、设置接口

### 14.1 获取用户设置

**GET** /api/v1/settings

**请求头**：需要Authorization

**响应**：
```json
{
  "success": true,
  "data": {
    "theme": "light",
    "defaultCalendarView": "month",
    "language": "zh-CN"
  }
}
```

### 14.2 更新用户设置

**PUT** /api/v1/settings

**请求头**：需要Authorization

**请求体**：
```json
{
  "theme": "dark",
  "defaultCalendarView": "week"
}
```

**响应**：
```json
{
  "success": true,
  "message": "设置已保存"
}
```
