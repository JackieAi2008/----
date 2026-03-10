/**
 * 中集智历 - Toast 通知 Store
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface ToastMessage {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
}

export const useToastStore = defineStore('toast', () => {
  const toasts = ref<ToastMessage[]>([])
  const maxToasts = 5

  const visibleToasts = computed(() => toasts.value.slice(0, maxToasts))

  function generateId(): string {
    return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  function addToast(toast: Omit<ToastMessage, 'id'>): string {
    const id = generateId()
    const newToast: ToastMessage = {
      ...toast,
      id,
      duration: toast.duration ?? 4000
    }

    toasts.value.push(newToast)

    // 自动移除
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, newToast.duration)
    }

    return id
  }

  function removeToast(id: string): void {
    const index = toasts.value.findIndex(t => t.id === id)
    if (index > -1) {
      toasts.value.splice(index, 1)
    }
  }

  function clearAll(): void {
    toasts.value = []
  }

  // 便捷方法
  function success(title: string, message?: string): string {
    return addToast({ type: 'success', title, message })
  }

  function error(title: string, message?: string): string {
    return addToast({ type: 'error', title, message, duration: 6000 })
  }

  function warning(title: string, message?: string): string {
    return addToast({ type: 'warning', title, message })
  }

  function info(title: string, message?: string): string {
    return addToast({ type: 'info', title, message })
  }

  return {
    toasts,
    visibleToasts,
    addToast,
    removeToast,
    clearAll,
    success,
    error,
    warning,
    info
  }
})
