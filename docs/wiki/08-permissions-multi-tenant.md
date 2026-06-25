# 08 权限与多租户

## 角色层级
```
ADMIN(超管)
  └─ DEPT_ADMIN(部门管理员)
        └─ USER(普通用户)
```

## 关键中间件
- `auth` → 拿 `req.user`
- `requireAdmin` / `requireDeptAdmin`(在 `middlewares/auth.ts`)
- `requireTaskPermission(action)` 在 `taskPermission.ts`,按项目成员关系判断
- `departmentPermission.ts` 用于部门管理接口

## 项目可见性(`Project.visibility`)
- `PRIVATE`:仅项目成员
- `DEPARTMENT`:部门内成员可见
- `PUBLIC`:全租户可见(读)

## 跨部门邀请
- 流程:`ProjectInvite` 表记录 `fromUserId → toUserId`
- 接受/拒绝有独立接口
- 注意:**目前没有审批流**,直接接受;若需审批在 plan 阶段补

## 评价/工作总结(对应需求 2)
- `Evaluation` 表:由「被评价方的上级/指定人」写入
- 评论 `Comment` 是通用表,跟任务不一定要绑
- 实施思路:把 image2 「评论」区块的「发送评论」按钮改为「提交工作评价」,后端写 `Evaluation`;旧的 `Comment` 路径保留(评论通用化)或下线(以收紧需求为准)
