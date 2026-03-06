/**
 * 中集智历 - 推送通知控制器
 */
import { Request, Response } from 'express';
/**
 * 获取 VAPID 公钥
 */
export declare function getVapidPublicKey(_req: Request, res: Response): Promise<void>;
/**
 * 订阅推送通知
 */
export declare function subscribe(req: Request, res: Response): Promise<void>;
/**
 * 取消订阅
 */
export declare function unsubscribe(req: Request, res: Response): Promise<void>;
/**
 * 获取订阅状态
 */
export declare function getSubscriptionStatus(req: Request, res: Response): Promise<void>;
/**
 * 发送测试通知
 */
export declare function sendTestNotification(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=pushController.d.ts.map