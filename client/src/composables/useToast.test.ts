/**
 * Toast 组合式函数测试
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('useToast', () => {
  let useToast: typeof import('./useToast').useToast

  beforeEach(async () => {
    // 重置模块缓存以隔离测试
    vi.resetModules()
    vi.useFakeTimers()
    // 重新导入模块
    useToast = (await import('./useToast')).useToast
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('show', () => {
    it('应该添加 toast 消息到列表', () => {
      const { toasts, show } = useToast()

      show('测试消息')

      expect(toasts.value.length).toBe(1)
      expect(toasts.value[0].message).toBe('测试消息')
    })

    it('应该返回 toast ID', () => {
      const { show } = useToast()

      const id = show('测试消息')

      expect(typeof id).toBe('number')
    })

    it('应该使用默认类型 info', () => {
      const { toasts, show } = useToast()

      show('测试消息')

      expect(toasts.value[0].type).toBe('info')
    })

    it('应该支持不同类型', () => {
      const { toasts, show } = useToast()

      show('成功消息', 'success')

      expect(toasts.value[0].type).toBe('success')
    })

    it('应该在指定时间后自动移除', () => {
      const { toasts, show } = useToast()

      show('测试消息', 'info', 3000)

      expect(toasts.value.length).toBe(1)

      vi.advanceTimersByTime(3000)

      expect(toasts.value.length).toBe(0)
    })

    it('duration 为 0 时不应自动移除', () => {
      const { toasts, show } = useToast()

      show('持久消息', 'info', 0)

      expect(toasts.value.length).toBe(1)

      vi.advanceTimersByTime(10000)

      expect(toasts.value.length).toBe(1)
    })
  })

  describe('remove', () => {
    it('应该移除指定的 toast', () => {
      const { toasts, show, remove } = useToast()

      const id = show('测试消息')
      expect(toasts.value.length).toBe(1)

      remove(id)

      expect(toasts.value.length).toBe(0)
    })

    it('移除不存在的 ID 应该不会报错', () => {
      const { remove } = useToast()

      expect(() => remove(999)).not.toThrow()
    })

    it('应该只移除指定的 toast', () => {
      const { toasts, show, remove } = useToast()

      const id1 = show('消息1', 'info', 0)
      const id2 = show('消息2', 'info', 0)

      expect(toasts.value.length).toBe(2)

      remove(id1)

      expect(toasts.value.length).toBe(1)
      expect(toasts.value[0].id).toBe(id2)
    })
  })

  describe('便捷方法', () => {
    it('success 应该创建成功类型的 toast', () => {
      const { toasts, success } = useToast()

      success('操作成功')

      expect(toasts.value[0].type).toBe('success')
      expect(toasts.value[0].message).toBe('操作成功')
    })

    it('error 应该创建错误类型的 toast', () => {
      const { toasts, error } = useToast()

      error('操作失败')

      expect(toasts.value[0].type).toBe('error')
      expect(toasts.value[0].message).toBe('操作失败')
    })

    it('warning 应该创建警告类型的 toast', () => {
      const { toasts, warning } = useToast()

      warning('警告信息')

      expect(toasts.value[0].type).toBe('warning')
      expect(toasts.value[0].message).toBe('警告信息')
    })

    it('info 应该创建信息类型的 toast', () => {
      const { toasts, info } = useToast()

      info('提示信息')

      expect(toasts.value[0].type).toBe('info')
      expect(toasts.value[0].message).toBe('提示信息')
    })
  })

  describe('toast 别名', () => {
    it('toast 应该是 show 的别名', () => {
      const { toasts, toast } = useToast()

      toast('通过别名显示')

      expect(toasts.value[0].message).toBe('通过别名显示')
    })
  })

  describe('多个 toast', () => {
    it('应该支持同时显示多个 toast', () => {
      const { toasts, show } = useToast()

      show('消息1', 'info', 0)
      show('消息2', 'success', 0)
      show('消息3', 'error', 0)

      expect(toasts.value.length).toBe(3)
      expect(toasts.value.map(t => t.type)).toEqual(['info', 'success', 'error'])
    })

    it('每个 toast 应该有唯一的 ID', () => {
      const { show } = useToast()

      const id1 = show('消息1')
      const id2 = show('消息2')
      const id3 = show('消息3')

      const ids = [id1, id2, id3]
      const uniqueIds = [...new Set(ids)]
      expect(uniqueIds.length).toBe(3)
    })
  })
})
