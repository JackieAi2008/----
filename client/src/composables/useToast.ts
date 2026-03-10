/**
 * 中集智历 - Toast通知组合式函数
 */
import { useToastStore } from '@/stores/toast'
import type { ToastMessage } from '@/stores/toast'

export function useToast() {
  const toastStore = useToastStore()

  /**
   * 显示 Toast 通知
   * @param title 标题
   * @param type 类型
   * @param message 可选的详细消息
   * @param duration 持续时间（毫秒）
   */
  function show(
    title: string,
    type: ToastMessage['type'] = 'info',
    message?: string,
    duration?: number
  ): string {
    return toastStore.addToast({ title, type, message, duration })
  }

  /**
   * 显示成功通知
   */
  function success(title: string, message?: string): string {
    return toastStore.success(title, message)
  }

  /**
   * 显示错误通知
   */
  function error(title: string, message?: string): string {
    return toastStore.error(title, message)
  }

  /**
   * 显示警告通知
   */
  function warning(title: string, message?: string): string {
    return toastStore.warning(title, message)
  }

  /**
   * 显示信息通知
   */
  function info(title: string, message?: string): string {
    return toastStore.info(title, message)
  }

  /**
   * 移除指定通知
   */
  function remove(id: string): void {
    toastStore.removeToast(id)
  }

  /**
   * 清除所有通知
   */
  function clearAll(): void {
    toastStore.clearAll()
  }

  return {
    toasts: toastStore.toasts,
    show,
    remove,
    clearAll,
    success,
    error,
    warning,
    info,
    toast: show
  }
}
