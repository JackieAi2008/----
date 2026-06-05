/**
 * 中集智历 - 推送服务
 * 使用 Web Push API 实现浏览器推送通知
 */
import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';
import webpush from 'web-push';
// VAPID 配置
export const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    logger.info('[Push] VAPID configured, web-push ready');
}
else {
    logger.warn('[Push] VAPID keys not configured, push notifications disabled');
}
/**
 * 获取 VAPID 公钥
 */
export function getVapidPublicKey() {
    return VAPID_PUBLIC_KEY;
}
/**
 * 保存推送订阅
 */
export async function savePushSubscription(userId, subscription, userAgent) {
    // 检查是否已存在
    const existing = await prisma.pushSubscription.findUnique({
        where: { endpoint: subscription.endpoint }
    });
    if (existing) {
        // 更新
        await prisma.pushSubscription.update({
            where: { endpoint: subscription.endpoint },
            data: {
                keys: JSON.stringify(subscription.keys),
                userAgent,
                updatedAt: new Date()
            }
        });
    }
    else {
        // 创建新订阅
        await prisma.pushSubscription.create({
            data: {
                userId,
                endpoint: subscription.endpoint,
                keys: JSON.stringify(subscription.keys),
                userAgent
            }
        });
    }
}
/**
 * 删除推送订阅
 */
export async function removePushSubscription(userId, endpoint) {
    await prisma.pushSubscription.deleteMany({
        where: {
            userId,
            endpoint
        }
    });
}
/**
 * 获取用户的所有推送订阅
 */
export async function getUserSubscriptions(userId) {
    return prisma.pushSubscription.findMany({
        where: { userId }
    });
}
/**
 * 发送推送通知给指定用户
 * 注意：实际发送需要安装 web-push 库
 */
export async function sendPushToUser(userId, payload) {
    const subscriptions = await getUserSubscriptions(userId);
    let success = 0;
    let failed = 0;
    for (const sub of subscriptions) {
        try {
            const pushSubscription = {
                endpoint: sub.endpoint,
                keys: JSON.parse(sub.keys)
            };
            await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
            logger.info(`[Push] 发送通知给 ${userId}: ${payload.title}`);
            success++;
        }
        catch (error) {
            logger.error(`[Push] 发送失败:`, error);
            failed++;
            // 如果订阅失效，删除它
            if (error instanceof Error && error.message.includes('410')) {
                await prisma.pushSubscription.delete({
                    where: { id: sub.id }
                });
            }
        }
    }
    return { success, failed };
}
/**
 * 发送任务提醒通知
 */
export async function sendTaskReminder(userId, taskTitle, taskId, dueDate) {
    const now = new Date();
    const hoursLeft = Math.round((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60));
    let body;
    if (hoursLeft <= 0) {
        body = `任务「${taskTitle}」已到期`;
    }
    else if (hoursLeft <= 24) {
        body = `任务「${taskTitle}」将在 ${hoursLeft} 小时后到期`;
    }
    else {
        const daysLeft = Math.round(hoursLeft / 24);
        body = `任务「${taskTitle}」将在 ${daysLeft} 天后到期`;
    }
    await sendPushToUser(userId, {
        title: '任务提醒',
        body,
        icon: '/logo.png',
        data: {
            url: `/tasks/${taskId}`,
            taskId
        },
        actions: [
            { action: 'view', title: '查看任务' },
            { action: 'complete', title: '标记完成' }
        ]
    });
}
/**
 * 发送任务指派通知
 */
export async function sendTaskAssignedNotification(userId, taskTitle, taskId, assignerName) {
    await sendPushToUser(userId, {
        title: '新任务指派',
        body: `${assignerName} 将任务「${taskTitle}」指派给了您`,
        icon: '/logo.png',
        data: {
            url: `/tasks/${taskId}`,
            taskId
        }
    });
}
/**
 * 发送项目邀请通知
 */
export async function sendProjectInviteNotification(userId, projectName, projectId, inviterName) {
    await sendPushToUser(userId, {
        title: '项目邀请',
        body: `${inviterName} 邀请您加入项目「${projectName}」`,
        icon: '/logo.png',
        data: {
            url: `/projects/${projectId}`,
            projectId
        }
    });
}
/**
 * 检查并发送到期提醒
 * 应该由定时任务调用
 */
export async function checkAndSendDueReminders() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    // 查找即将到期的任务
    const tasksDueSoon = await prisma.task.findMany({
        where: {
            deletedAt: null,
            status: { not: 'DONE' },
            dueDate: {
                lte: tomorrow,
                gt: now
            }
        },
        include: {
            assignee: { select: { id: true } }
        }
    });
    for (const task of tasksDueSoon) {
        if (task.assigneeId) {
            await sendTaskReminder(task.assigneeId, task.title, task.id, task.dueDate);
        }
    }
}
//# sourceMappingURL=pushService.js.map