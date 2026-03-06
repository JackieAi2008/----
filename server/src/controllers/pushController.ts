/**
 * 中集智历 - 推送通知控制器
 */
import { Request, Response } from 'express'
import * as pushService from '../services/pushService.js'

/**
 * 获取 VAPID 公钥
 */
export async function getVapidPublicKey(_req: Request, res: Response) {
  const publicKey = pushService.getVapidPublicKey()

  res.json({
    success: true,
    data: { publicKey }
  })
}

/**
 * 订阅推送通知
 */
export async function subscribe(req: Request, res: Response) {
  const userId = (req as { userId?: string }).userId
  const { subscription } = req.body

  if (!subscription || !subscription.endpoint) {
    res.status(400).json({
      success: false,
      message: '无效的订阅信息'
    })
    return
  }

  const userAgent = req.headers['user-agent']

  await pushService.savePushSubscription(
    userId!,
    {
      endpoint: subscription.endpoint,
      keys: subscription.keys
    },
    userAgent
  )

  res.json({
    success: true,
    message: '订阅成功'
  })
}

/**
 * 取消订阅
 */
export async function unsubscribe(req: Request, res: Response) {
  const userId = (req as { userId?: string }).userId
  const { endpoint } = req.body

  if (!endpoint) {
    res.status(400).json({
      success: false,
      message: '缺少 endpoint 参数'
    })
    return
  }

  await pushService.removePushSubscription(userId!, endpoint)

  res.json({
    success: true,
    message: '已取消订阅'
  })
}

/**
 * 获取订阅状态
 */
export async function getSubscriptionStatus(req: Request, res: Response) {
  const userId = (req as { userId?: string }).userId

  const subscriptions = await pushService.getUserSubscriptions(userId!)

  res.json({
    success: true,
    data: {
      subscribed: subscriptions.length > 0,
      count: subscriptions.length,
      devices: subscriptions.map(sub => ({
        id: sub.id,
        userAgent: sub.userAgent,
        createdAt: sub.createdAt
      }))
    }
  })
}

/**
 * 发送测试通知
 */
export async function sendTestNotification(req: Request, res: Response) {
  const userId = (req as { userId?: string }).userId

  const result = await pushService.sendPushToUser(userId!, {
    title: '测试通知',
    body: '这是一条测试推送消息',
    icon: '/logo.png',
    data: { type: 'test' }
  })

  res.json({
    success: true,
    data: result,
    message: `发送完成：成功 ${result.success}，失败 ${result.failed}`
  })
}
