# 01 项目总览(Overview)

> 摘自 `README.md`、`server/package.json`、`client/package.json`、`docs/00-产品开发文档总览.md`。

## 一句话
中集智历 = 面向团队的**协同日历管理系统**,核心场景是项目/任务/日历/通知。

## 角色
- **超管 / 部门管理员 / 项目成员** 三类角色
- 多部门、多租户模型(已落地 2026-03 系列 plan)

## 模块脑图

```
中集智历
├─ 认证(注册/登录/找回密码/JWT)
├─ 项目(Project + ProjectMember + ProjectInvite)
├─ 任务(Task + TaskCategory + TaskTemplate + TaskCollaborator)
├─ 交付物与评价(Evaluation + DeliverableOption)
├─ 部门(Department + 部门成员管理 + 跨部门邀请)
├─ 日历(Calendar 多视图)
├─ 概览/统计(Dashboard + Reports)
├─ 通知(Notification + 站内铃铛)
├─ 推送(Web Push / VAPID)
├─ AI 总结(aiSummaryService,可选 Deepseek)
└─ 总结归档(ArchivedTasks / DeletedProjects)
```

## 关键脚本
- 后端:见 `server/package.json` 的 `scripts`(`dev`/`build`/`start`/`prisma:*`/`db:seed`/`test`)
- 前端:见 `client/package.json` 的 `scripts`(`dev`/`build`/`preview`/`test`)
- 一键脚本:`backend/scripts/dev/start-all.ps1`、`stop-all.ps1`、`smoke-test.ps1`(如有)

## 默认账号
- 邮箱:`admin@example.com` / 密码:`admin123`(种子数据,**首次登录后必须改**)
