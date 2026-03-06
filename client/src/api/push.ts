/**
 * 中集智历 - 推送通知API
 */
import { get, post } from '@/utils/request'

// 订阅状态
export interface SubscriptionStatus {
  subscribed: boolean
  count: number
  devices: Array<{
    id: string
    userAgent?: string
    createdAt: string
  }>
}

/**
 * 获取 VAPID 公钥
 */
export async function getVapidPublicKey(): Promise<string> {
  const response = await get<{ publicKey: string }>('/push/vapid-public-key')
  return response.data!.publicKey
}

/**
 * 订阅推送通知
 */
export async function subscribePush(subscription: PushSubscriptionJSON): Promise<void> {
  await post('/push/subscribe', { subscription })
}

/**
 * 取消订阅
 */
export async function unsubscribePush(endpoint: string): Promise<void> {
  await post('/push/unsubscribe', { endpoint })
}

/**
 * 获取订阅状态
 */
export async function getSubscriptionStatus(): Promise<SubscriptionStatus> {
  const response = await get<SubscriptionStatus>('/push/status')
  return response.data!
}

/**
 * 发送测试通知
 */
export async function sendTestNotification(): Promise<{ success: number; failed: number }> {
  const response = await post<{ success: number; failed: number }>('/push/test')
  return response.data!
}

/**
 * 将 Base64 字符串转换为 Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

/**
 * 检查浏览器是否支持推送通知
 */
export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window
}

/**
 * 请求通知权限
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied'
  }

  return await Notification.requestPermission()
}

/**
 * 订阅推送（完整流程）
 */
export async function subscribeToPush(): Promise<boolean> {
  if (!isPushSupported()) {
    throw new Error('浏览器不支持推送通知')
  }

  // 请求权限
  const permission = await requestNotificationPermission()
  if (permission !== 'granted') {
    throw new Error('通知权限被拒绝')
  }

  // 注册 Service Worker
  const registration = await navigator.serviceWorker.ready

  // 获取 VAPID 公钥
  const vapidPublicKey = await getVapidPublicKey()

  // 订阅
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource
  })

  // 发送到服务器
  await subscribePush(subscription.toJSON())

  return true
}

/**
 * 取消推送订阅（完整流程）
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  if (!isPushSupported()) {
    return false
  }

  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()

  if (subscription) {
    await unsubscribePush(subscription.endpoint)
    await subscription.unsubscribe()
  }

  return true
}
