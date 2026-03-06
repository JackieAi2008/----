/**
 * 中集智历 - 通知控制器
 */
import { Request, Response } from 'express';
/**
 * 获取通知列表
 */
export declare function getNotifications(req: Request, res: Response): Promise<void>;
/**
 * 获取未读通知数量
 */
export declare function getUnreadCount(req: Request, res: Response): Promise<void>;
/**
 * 标记通知为已读
 */
export declare function markAsRead(req: Request, res: Response): Promise<void>;
/**
 * 标记所有通知为已读
 */
export declare function markAllAsRead(req: Request, res: Response): Promise<void>;
/**
 * 删除通知
 */
export declare function deleteNotification(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=notificationController.d.ts.map