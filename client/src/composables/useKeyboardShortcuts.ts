/**
 * 中集智历 - 键盘快捷键组合式函数
 */
import { ref, onMounted, onUnmounted } from 'vue'

export interface ShortcutConfig {
  key: string
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  meta?: boolean
  action: () => void
  description: string
  disabled?: () => boolean
}

interface RegisteredShortcut extends ShortcutConfig {
  id: string
}

const shortcuts = ref<RegisteredShortcut[]>([])
let shortcutId = 0

/**
 * 判断当前是否在输入元素中
 */
function isInInputElement(): boolean {
  const activeElement = document.activeElement
  if (!activeElement) return false

  const tagName = activeElement.tagName.toLowerCase()
  const isInput = tagName === 'input' || tagName === 'textarea' || tagName === 'select'
  const isEditable = (activeElement as HTMLElement).isContentEditable

  return isInput || isEditable
}

/**
 * 判断是否为 Mac 系统
 */
export function isMac(): boolean {
  return /Mac|iPod|iPhone|iPad/.test(navigator.platform)
}

/**
 * 生成快捷键 ID
 */
function generateId(): string {
  return `shortcut_${++shortcutId}`
}

/**
 * 规范化按键值
 */
function normalizeKey(key: string): string {
  const keyMap: Record<string, string> = {
    '/': '/',
    '?': '?',
    'Escape': 'Escape',
    'Esc': 'Escape'
  }
  return keyMap[key] || key.toLowerCase()
}

/**
 * 检查快捷键是否匹配
 */
function matchesShortcut(event: KeyboardEvent, shortcut: RegisteredShortcut): boolean {
  const normalizedKey = normalizeKey(event.key)
  const targetKey = normalizeKey(shortcut.key)

  // 检查按键是否匹配
  if (normalizedKey !== targetKey) {
    return false
  }

  // 在 Mac 上使用 metaKey (Cmd)，在其他系统上使用 ctrlKey
  const isMacOS = isMac()
  const requiresCtrl = shortcut.ctrl || shortcut.meta

  if (requiresCtrl) {
    if (isMacOS && !event.metaKey) return false
    if (!isMacOS && !event.ctrlKey) return false
  } else {
    // 如果不需要 Ctrl/Cmd，确保没有按下这些键
    if (event.ctrlKey || event.metaKey) return false
  }

  // 检查 Shift 键
  if (shortcut.shift && !event.shiftKey) return false
  if (!shortcut.shift && event.shiftKey && shortcut.key.length === 1) return false

  // 检查 Alt 键
  if (shortcut.alt && !event.altKey) return false
  if (!shortcut.alt && event.altKey) return false

  return true
}

/**
 * 键盘事件处理函数
 */
function handleKeyDown(event: KeyboardEvent) {
  // 检查是否在输入元素中（排除 Escape 键）
  if (isInInputElement() && event.key !== 'Escape') {
    return
  }

  // 遍历所有注册的快捷键
  for (const shortcut of shortcuts.value) {
    // 检查是否被禁用
    if (shortcut.disabled && shortcut.disabled()) {
      continue
    }

    // 检查是否匹配
    if (matchesShortcut(event, shortcut)) {
      event.preventDefault()
      event.stopPropagation()
      shortcut.action()
      return
    }
  }
}

/**
 * 注册快捷键
 */
export function registerShortcut(config: ShortcutConfig): string {
  const id = generateId()
  shortcuts.value.push({
    ...config,
    id
  })
  return id
}

/**
 * 注销快捷键
 */
export function unregisterShortcut(id: string): void {
  const index = shortcuts.value.findIndex(s => s.id === id)
  if (index > -1) {
    shortcuts.value.splice(index, 1)
  }
}

/**
 * 更新快捷键
 */
export function updateShortcut(id: string, config: Partial<ShortcutConfig>): void {
  const shortcut = shortcuts.value.find(s => s.id === id)
  if (shortcut) {
    Object.assign(shortcut, config)
  }
}

/**
 * 获取所有快捷键
 */
export function getAllShortcuts(): RegisteredShortcut[] {
  return [...shortcuts.value]
}

/**
 * 清除所有快捷键
 */
export function clearAllShortcuts(): void {
  shortcuts.value = []
}

/**
 * 格式化快捷键显示文本
 */
export function formatShortcut(shortcut: ShortcutConfig): string {
  const isMacOS = isMac()
  const parts: string[] = []

  // Ctrl/Cmd
  if (shortcut.ctrl || shortcut.meta) {
    parts.push(isMacOS ? 'Cmd' : 'Ctrl')
  }

  // Shift
  if (shortcut.shift) {
    parts.push('Shift')
  }

  // Alt
  if (shortcut.alt) {
    parts.push(isMacOS ? 'Option' : 'Alt')
  }

  // Key
  let key = shortcut.key
  if (key === 'Escape') {
    key = 'Esc'
  } else if (key === '/') {
    key = '/'
  } else if (key === '?') {
    key = '?'
  } else {
    key = key.toUpperCase()
  }
  parts.push(key)

  return parts.join(isMacOS ? ' + ' : ' + ')
}

/**
 * 快捷键组合式函数
 */
export function useKeyboardShortcuts() {
  const registeredIds = ref<string[]>([])

  /**
   * 注册单个快捷键
   */
  function register(config: ShortcutConfig): string {
    const id = registerShortcut(config)
    registeredIds.value.push(id)
    return id
  }

  /**
   * 批量注册快捷键
   */
  function registerAll(configs: ShortcutConfig[]): string[] {
    return configs.map(config => register(config))
  }

  /**
   * 注销所有由当前实例注册的快捷键
   */
  function unregisterAll(): void {
    registeredIds.value.forEach(id => unregisterShortcut(id))
    registeredIds.value = []
  }

  // 组件挂载时添加全局事件监听
  onMounted(() => {
    // 如果是第一个使用该 composable 的组件，添加事件监听
    if (shortcuts.value.length === 0 || !document.querySelector('[data-shortcuts-listener]')) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.setAttribute('data-shortcuts-listener', 'true')
    }
  })

  // 组件卸载时清理
  onUnmounted(() => {
    // 注销当前实例注册的所有快捷键
    unregisterAll()

    // 如果没有快捷键了，移除事件监听
    if (shortcuts.value.length === 0) {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.removeAttribute('data-shortcuts-listener')
    }
  })

  return {
    register,
    registerAll,
    unregister: unregisterShortcut,
    unregisterAll,
    getAllShortcuts,
    formatShortcut
  }
}

/**
 * 全局快捷键管理（用于在 setup 外部使用）
 */
export const keyboardShortcuts = {
  register: registerShortcut,
  unregister: unregisterShortcut,
  getAll: getAllShortcuts,
  clear: clearAllShortcuts,
  format: formatShortcut
}
