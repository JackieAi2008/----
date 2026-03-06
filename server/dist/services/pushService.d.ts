export declare const VAPID_PUBLIC_KEY: string;
export declare const vapidConfig: {
    publicKey: string;
    privateKey: string;
    subject: string;
};
interface PushSubscriptionData {
    endpoint: string;
    keys: {
        p256dh: string;
        auth: string;
    };
}
interface PushPayload {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    data?: Record<string, unknown>;
    actions?: Array<{
        action: string;
        title: string;
        icon?: string;
    }>;
}
/**
 * 获取 VAPID 公钥
 */
export declare function getVapidPublicKey(): string;
/**
 * 保存推送订阅
 */
export declare function savePushSubscription(userId: string, subscription: PushSubscriptionData, userAgent?: string): Promise<void>;
/**
 * 删除推送订阅
 */
export declare function removePushSubscription(userId: string, endpoint: string): Promise<void>;
/**
 * 获取用户的所有推送订阅
 */
export declare function getUserSubscriptions(userId: string): Promise<{
    keys: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    userId: string;
    endpoint: string;
    userAgent: string | null;
}[]>;
/**
 * 发送推送通知给指定用户
 * 注意：实际发送需要安装 web-push 库
 */
export declare function sendPushToUser(userId: string, payload: PushPayload): Promise<{
    success: number;
    failed: number;
}>;
/**
 * 发送任务提醒通知
 */
export declare function sendTaskReminder(userId: string, taskTitle: string, taskId: string, dueDate: Date): Promise<void>;
/**
 * 发送任务指派通知
 */
export declare function sendTaskAssignedNotification(userId: string, taskTitle: string, taskId: string, assignerName: string): Promise<void>;
/**
 * 发送项目邀请通知
 */
export declare function sendProjectInviteNotification(userId: string, projectName: string, projectId: string, inviterName: string): Promise<void>;
/**
 * 检查并发送到期提醒
 * 应该由定时任务调用
 */
export declare function checkAndSendDueReminders(): Promise<void>;
export {};
//# sourceMappingURL=pushService.d.ts.map