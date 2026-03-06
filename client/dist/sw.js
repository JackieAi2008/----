/**
 * 中集智历 - Service Worker
 * 处理推送通知
 */

// 监听推送事件
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {}

  const title = data.title || '中集智历'
  const options = {
    body: data.body || '您有新的通知',
    icon: data.icon || '/logo.png',
    badge: data.badge || '/badge.png',
    data: data.data || {},
    actions: data.actions || [],
    tag: data.tag || 'default',
    renotify: data.renotify || false
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  )
})

// 监听通知点击事件
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const data = event.notification.data || {}
  const action = event.action

  // 处理不同操作
  if (action === 'view' && data.url) {
    // 打开任务页面
    event.waitUntil(
      clients.openWindow(data.url)
    )
  } else if (action === 'complete' && data.taskId) {
    // 标记任务完成（需要调用 API）
    // 这里简化处理，直接打开任务页面
    event.waitUntil(
      clients.openWindow(`/tasks/${data.taskId}`)
    )
  } else if (data.url) {
    // 默认打开链接
    event.waitUntil(
      clients.openWindow(data.url)
    )
  } else {
    // 打开首页
    event.waitUntil(
      clients.openWindow('/')
    )
  }
})

// 监听通知关闭事件
self.addEventListener('notificationclose', (event) => {
  // 可以在这里记录用户关闭了通知
  console.log('通知已关闭', event.notification.tag)
})

// Service Worker 激活
self.addEventListener('activate', (event) => {
  console.log('Service Worker 已激活')
})

// Service Worker 安装
self.addEventListener('install', (event) => {
  console.log('Service Worker 已安装')
  self.skipWaiting()
})
