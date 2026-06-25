# 中集智历 Wiki(由 code wiki 自动生成,2026-06-24)

> 工程索引型 wiki。覆盖代码、Prisma、路由、视图、构建/测试入口。
> 产品/需求规格请回到 `docs/00-产品开发文档总览.md`、`docs/01-需求规格说明书.md`。

## 目录

| 文件 | 内容 |
|------|------|
| `01-overview.md` | 项目一句话定位、模块脑图、关键脚本 |
| `02-architecture.md` | 前/后端架构、通信约定、部署形态 |
| `03-data-model.md` | Prisma 全部 14 个 model 的字段、关系、约束 |
| `04-api-routes.md` | 全部 REST 端点(按模块) |
| `05-frontend-views.md` | 前端视图/路由/组件树 |
| `06-server-services.md` | 服务层、调度器、统计、AI 摘要、推送 |
| `07-notifications-push.md` | 通知、推送、提醒链路 |
| `08-permissions-multi-tenant.md` | 部门/项目权限、跨部门邀请、可见性 |
| `09-build-test-run.md` | 构建、测试、运行、数据库迁移、种子数据 |

## 生成方式

本目录文件由 Codex 在 Plan 模式下根据 `server/src`、`client/src`、`server/prisma/schema.prisma` 自动生成。
下次需要刷新时,直接要求「重新生成项目 wiki」即可。
