# 03 数据模型(Data Model)

> 来源:`server/prisma/schema.prisma`。共 **14 个 model**,无显式 `enum`(状态/优先级都是 `String`)。
> 因此后续做新功能时,**状态/优先级常量**只能以字符串字面量约定,见各控制器与前端 `types/`,不要在数据库层做强制。

## Model 索引
| Model | 关键字段 | 备注 |
|-------|----------|------|
| User | email, password, name, role, departmentId, isActive | role=`ADMIN/DEPT_ADMIN/USER` |
| Department | name, code, parentId | 自引用,支持多级 |
| Project | name, ownerId, departmentId, status, visibility | 可见性 `PRIVATE/DEPARTMENT/PUBLIC` |
| ProjectMember | projectId, userId, role | 项目内角色 |
| ProjectInvite | projectId, fromUserId, toUserId, status | 跨部门邀请 |
| Task | projectId, title, dueDate, status, priority, assigneeId, categoryId, deliverableId, completionNote | 主实体 |
| TaskCategory | name, scope, departmentId | 项目/部门/全局 |
| TaskTemplate | name, payload(JSON), scope | 任务模板 |
| TaskCollaborator | taskId, userId | 协作者(非负责人) |
| Evaluation | taskId, evaluatorId, score, comment, evaluatedAt | 工作评价(对应需求 2) |
| DeliverableOption | name, scope | 交付物选项(对应 image1「交付成果」) |
| Comment | targetType, targetId, authorId, content | 评论(已存在但需求 2 要改名为「工作评价」) |
| Notification | userId, type, payload, readAt | 站内通知 |
| PushSubscription | userId, endpoint, keys | Web Push 订阅 |
| Attachment | targetType, targetId, url, mimeType | 附件(任务/评论) |
| AuditLog | actorId, action, target, payload | 审计 |
| SecurityAnswer | userId, question, answerHash | 找回密码用 |

## 关注点(与新需求直接相关)
- `Task.completionNote` / `Evaluation` / `DeliverableOption` 已经在 20260609 的迁移里加好,「进展跟踪→工作总结」+ AI 总结有现成数据可挂
- `Comment` 是**通用评论**(`targetType + targetId`),不是任务评论;需求 2 中「工作评价」建议复用 `Evaluation` 而不是再造一个 Comment 子表
- `Task.assigneeId` 是单一负责人(对应 image4);不存在「多负责人」概念,需求 7 的「补用户」只需新增 User 行
- `Notification` 已有「通知」通道;需求 6「邮件提醒」是新增通道,不是替代站内通知
