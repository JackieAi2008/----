<template>
  <div class="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-300">
    <!-- 卡片头部 -->
    <div
      class="p-3 md:p-4 cursor-pointer transition-all duration-200"
      :class="{ 'bg-gray-50/50': isExpanded }"
      @click="handleToggle"
    >
      <div class="flex items-center justify-between">
        <div class="min-w-0 flex-1">
          <p class="text-xs md:text-sm text-gray-500 truncate">{{ title }}</p>
          <p class="text-2xl md:text-3xl font-bold mt-1" :class="countClass">
            {{ count }}
          </p>
        </div>
        <div class="flex items-center gap-2 flex-shrink-0">
          <div
            class="w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center shadow-sm"
            :class="iconBgClass"
          >
            <component :is="icon" class="w-5 h-5 md:w-6 md:h-6" :class="iconClass" />
          </div>
          <ChevronDown
            class="w-5 h-5 text-gray-400 transition-transform duration-200"
            :class="{ 'rotate-180': isExpanded }"
          />
        </div>
      </div>
    </div>

    <!-- 展开内容 -->
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      leave-active-class="transition-all duration-200 ease-in"
      enter-from-class="max-h-0 opacity-0"
      leave-to-class="max-h-0 opacity-0"
    >
      <div v-show="isExpanded" class="border-t border-gray-100">
        <div class="p-3">
          <!-- 空状态 -->
          <div v-if="items.length === 0" class="text-center py-4 text-gray-500">
            <component
              :is="icon"
              class="w-8 h-8 mx-auto mb-2 text-gray-300"
            />
            <p class="text-sm">{{ emptyText }}</p>
          </div>

          <!-- 内容列表 -->
          <ul v-else class="space-y-1.5">
            <li
              v-for="item in displayItems"
              :key="item.id"
              class="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer hover:bg-gray-50/80 transition-colors duration-200"
              @click="$emit('itemClick', item)"
            >
              <!-- 状态指示器 -->
              <div
                v-if="item.color"
                class="w-2.5 h-2.5 rounded-full flex-shrink-0"
                :style="{ backgroundColor: item.color }"
              ></div>
              <div
                v-else-if="item.status"
                class="w-2.5 h-2.5 rounded-full flex-shrink-0"
                :class="getStatusColor(item.status)"
              ></div>

              <!-- 内容 -->
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-800 truncate">
                  {{ item.title }}
                </p>
                <p v-if="item.subtitle" class="text-xs text-gray-500 truncate mt-0.5">
                  {{ item.subtitle }}
                </p>
              </div>

              <!-- 标签 -->
              <span
                v-if="item.badge"
                class="px-2 py-0.5 text-xs rounded-lg flex-shrink-0 font-medium"
                :class="item.badgeClass || 'bg-gray-100 text-gray-600'"
              >
                {{ item.badge }}
              </span>
            </li>
          </ul>

          <!-- 查看全部链接 -->
          <button
            v-if="showViewAll"
            class="w-full mt-2 py-2.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50/80 rounded-xl transition-colors duration-200 font-medium"
            @click.stop="$emit('viewAll')"
          >
            查看全部 ({{ count }}) →
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
/**
 * 中集智历 - 可展开统计卡片组件
 * 支持手风琴效果，点击展开显示内容列表
 */
import { ref, computed, type Component } from 'vue'
import { ChevronDown } from 'lucide-vue-next'

export interface StatCardItem {
  id: string
  title: string
  subtitle?: string
  color?: string
  status?: string
  badge?: string
  badgeClass?: string
}

const props = withDefaults(
  defineProps<{
    title: string
    count: number
    icon: Component
    iconBgClass?: string
    iconClass?: string
    countClass?: string
    items?: StatCardItem[]
    emptyText?: string
    expanded?: boolean
  }>(),
  {
    iconBgClass: 'bg-blue-100',
    iconClass: 'text-blue-600',
    countClass: 'text-gray-800',
    items: () => [],
    emptyText: '暂无数据',
    expanded: false
  }
)

const emit = defineEmits<{
  toggle: []
  itemClick: [item: StatCardItem]
  viewAll: []
}>()

// 内部展开状态（可被外部控制）
const isExpanded = ref(props.expanded)

// 最多显示3条
const displayItems = computed(() => props.items.slice(0, 3))

// 是否显示查看全部按钮（超过3条时显示）
const showViewAll = computed(() => props.items.length > 3)

// 获取状态颜色
function getStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    TODO: 'bg-gray-400',
    IN_PROGRESS: 'bg-blue-500',
    DONE: 'bg-green-500',
    CANCELLED: 'bg-red-500'
  }
  return colorMap[status] || 'bg-gray-400'
}

// 切换展开状态
function handleToggle() {
  isExpanded.value = !isExpanded.value
  emit('toggle')
}

// 暴露方法供外部控制
defineExpose({
  expand: () => {
    isExpanded.value = true
  },
  collapse: () => {
    isExpanded.value = false
  },
  toggle: handleToggle
})
</script>
