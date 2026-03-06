<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click.self="$emit('close')">
    <div class="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] overflow-hidden">
      <!-- 头部 -->
      <div class="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 class="text-lg font-semibold text-gray-800">键盘快捷键</h3>
        <button
          @click="$emit('close')"
          class="p-1 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X class="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <!-- 内容区域 -->
      <div class="p-4 overflow-y-auto max-h-[calc(80vh-60px)]">
        <!-- 全局快捷键 -->
        <div class="mb-6">
          <h4 class="text-sm font-medium text-gray-500 mb-3 uppercase tracking-wide">全局操作</h4>
          <div class="space-y-2">
            <div
              v-for="shortcut in globalShortcuts"
              :key="shortcut.description"
              class="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50"
            >
              <span class="text-sm text-gray-700">{{ shortcut.description }}</span>
              <kbd class="shortcut-key">{{ shortcut.keyDisplay }}</kbd>
            </div>
          </div>
        </div>

        <!-- 日历视图快捷键 -->
        <div class="mb-6">
          <h4 class="text-sm font-medium text-gray-500 mb-3 uppercase tracking-wide">日历视图</h4>
          <div class="space-y-2">
            <div
              v-for="shortcut in calendarShortcuts"
              :key="shortcut.description"
              class="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50"
            >
              <span class="text-sm text-gray-700">{{ shortcut.description }}</span>
              <kbd class="shortcut-key">{{ shortcut.keyDisplay }}</kbd>
            </div>
          </div>
        </div>

        <!-- 通用快捷键 -->
        <div class="mb-6">
          <h4 class="text-sm font-medium text-gray-500 mb-3 uppercase tracking-wide">通用操作</h4>
          <div class="space-y-2">
            <div
              v-for="shortcut in commonShortcuts"
              :key="shortcut.description"
              class="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50"
            >
              <span class="text-sm text-gray-700">{{ shortcut.description }}</span>
              <kbd class="shortcut-key">{{ shortcut.keyDisplay }}</kbd>
            </div>
          </div>
        </div>

        <!-- 提示 -->
        <div class="mt-4 p-3 bg-blue-50 rounded-lg">
          <p class="text-xs text-blue-600">
            <span class="font-medium">提示：</span>
            在输入框中时，部分快捷键会被禁用以避免冲突。按 Esc 键可以随时关闭当前对话框。
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 中集智历 - 快捷键帮助组件
 */
import { computed } from 'vue'
import { X } from 'lucide-vue-next'
import { formatShortcut } from '@/composables/useKeyboardShortcuts'

defineEmits<{
  close: []
}>()

interface ShortcutItem {
  description: string
  keyDisplay: string
}

// 全局快捷键列表
const globalShortcuts = computed<ShortcutItem[]>(() => [
  {
    description: '新建任务',
    keyDisplay: formatShortcut({ key: 'n', ctrl: true, action: () => {}, description: '新建任务' })
  },
  {
    description: '打开全局搜索',
    keyDisplay: formatShortcut({ key: 'k', ctrl: true, action: () => {}, description: '打开全局搜索' })
  },
  {
    description: '显示快捷键帮助',
    keyDisplay: formatShortcut({ key: '/', ctrl: true, action: () => {}, description: '显示快捷键帮助' })
  }
])

// 日历视图快捷键
const calendarShortcuts = computed<ShortcutItem[]>(() => [
  {
    description: '切换到年视图',
    keyDisplay: '1'
  },
  {
    description: '切换到月视图',
    keyDisplay: '2'
  },
  {
    description: '切换到周视图',
    keyDisplay: '3'
  },
  {
    description: '切换到日视图',
    keyDisplay: '4'
  },
  {
    description: '切换到列表视图',
    keyDisplay: '5'
  },
  {
    description: '切换到甘特图视图',
    keyDisplay: '6'
  }
])

// 通用快捷键
const commonShortcuts = computed<ShortcutItem[]>(() => [
  {
    description: '关闭当前对话框',
    keyDisplay: 'Esc'
  }
])
</script>

<style scoped>
.shortcut-key {
  @apply inline-flex items-center justify-center min-w-[60px] px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 border border-gray-200 rounded shadow-sm;
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
}
</style>
