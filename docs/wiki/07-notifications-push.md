# 07 通知与推送

## 三类通道(现状 vs 需求 6)
| 通道 | 现状 | 备注 |
|------|------|------|
| 站内通知 | ✅ `Notification` 表 + 铃铛 | 已支持,前端 `NotificationPanel.vue` |
| Web Push | ✅ VAPID + 订阅表 | 已支持,前端 `PushSettings.vue` |
| 邮件 | ❌ 尚未接入 | 需求 6 要求新增 |

## 邮件接入设计要点(开发计划里细化)
- 协议:选 SMTP(简单)或直接调用邮件 API(无依赖)
- 凭据:`.env` 加 `SMTP_HOST/USER/PASS/FROM`(若 SMTP)
- 失败降级:邮件发送失败不回滚任务,只记 `Notification` 的 `emailSentAt` 字段
- 频率控制:加去重表(同一任务同一用户 24h 内最多 1 封)
- 用户开关:在 `PushSettings.vue` 同页加「邮件提醒」开关,写回 `User` 或独立 `NotificationPreference` 表

## 触发点
- 任务即将到期(3 天 / 1 天 / 当天)
- 任务逾期
- 项目新邀请
- 评价完成
- 任务被评论/批注
