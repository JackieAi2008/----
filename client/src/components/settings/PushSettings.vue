<template>
  <div class="push-settings bg-white rounded-lg border border-gray-200 p-6">
    <h3 class="text-lg font-semibold mb-4">浏览器推送通知</h3>

    <!-- 不支持提示 -->
    <div v-if="!isSupported" class="p-4 bg-yellow-50 rounded-lg text-yellow-700 text-sm">
      您的浏览器不支持推送通知功能
    </div>

    <!-- 权限被拒绝 -->
    <div v-else-if="permission === 'denied'" class="p-4 bg-red-50 rounded-lg text-red-700 text-sm">
      推送通知已被禁用。请在浏览器设置中开启通知权限。
    </div>

    <!-- 正常状态 -->
    <template v-else>
      <div class="flex items-center justify-between mb-4">
        <div>
          <p class="text-gray-800">启用推送通知</p>
          <p class="text-sm text-gray-500">接收任务到期、项目邀请等实时通知</p>
        </div>
        <button
          @click="togglePush"
          :disabled="loading"
          :class="[
            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
            subscribed ? 'bg-blue-600' : 'bg-gray-200'
          ]"
        >
          <span
            :class="[
              'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
              subscribed ? 'translate-x-6' : 'translate-x-1'
            ]"
          />
        </button>
      </div>

      <!-- 订阅设备列表 -->
      <div v-if="subscribed && status.count > 0" class="mt-4 pt-4 border-t border-gray-100">
        <p class="text-sm text-gray-600 mb-2">已订阅设备 ({{ status.count }})</p>
        <div class="space-y-2">
          <div
            v-for="device in status.devices"
            :key="device.id"
            class="flex items-center justify-between p-2 bg-gray-50 rounded text-sm"
          >
            <div>
              <p class="text-gray-800">{{ getDeviceName(device.userAgent) }}</p>
              <p class="text-xs text-gray-500">{{ formatDate(device.createdAt) }} 订阅</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 测试通知按钮 -->
      <div v-if="subscribed" class="mt-4 pt-4 border-t border-gray-100">
        <button
          @click="handleTestNotification"
          :disabled="sendingTest"
          class="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          {{ sendingTest ? '发送中...' : '发送测试通知' }}
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
/**
 * 中集智历 - 推送通知设置组件
 */
import { ref, onMounted } from 'vue'
import {
  isPushSupported,
  getSubscriptionStatus,
  subscribeToPush,
  unsubscribeFromPush,
  sendTestNotification,
  type SubscriptionStatus
} from '@/api/push'
import { formatDate } from '@/utils/date'
import { useToast } from '@/composables/useToast'

const { toast } = useToast()

const isSupported = ref(false)
const permission = ref<NotificationPermission>('default')
const subscribed = ref(false)
const loading = ref(false)
const sendingTest = ref(false)
const status = ref<SubscriptionStatus>({
  subscribed: false,
  count: 0,
  devices: []
})

onMounted(async () => {
  isSupported.value = isPushSupported()

  if (isSupported.value) {
    // 检查权限状态
    if ('Notification' in window) {
      permission.value = Notification.permission
    }

    // 获取订阅状态
    await fetchStatus()
  }
})

async function fetchStatus() {
  try {
    status.value = await getSubscriptionStatus()
    subscribed.value = status.value.subscribed
  } catch {
    // 忽略错误
  }
}

async function togglePush() {
  loading.value = true

  try {
    if (subscribed.value) {
      // 取消订阅
      await unsubscribeFromPush()
      subscribed.value = false
    } else {
      // 订阅
      await subscribeToPush()
      subscribed.value = true
    }

    await fetchStatus()
  } catch (error) {
    const message = error instanceof Error ? error.message : '操作失败'
    toast(message, 'error')
  } finally {
    loading.value = false
  }
}

async function handleTestNotification() {
  sendingTest.value = true

  try {
    const result = await sendTestNotification()
    toast(`测试通知已发送：成功 ${result.success}，失败 ${result.failed}`, 'success')
  } catch {
    toast('发送测试通知失败', 'error')
  } finally {
    sendingTest.value = false
  }
}

function getDeviceName(userAgent?: string): string {
  if (!userAgent) return '未知设备'

  if (userAgent.includes('iPhone')) return 'iPhone'
  if (userAgent.includes('iPad')) return 'iPad'
  if (userAgent.includes('Android')) return 'Android 设备'
  if (userAgent.includes('Mac')) return 'Mac'
  if (userAgent.includes('Windows')) return 'Windows 电脑'
  if (userAgent.includes('Linux')) return 'Linux 电脑'

  return '其他设备'
}
</script>
