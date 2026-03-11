<template>
  <div class="bg-white rounded-lg border border-gray-200 p-4">
    <div class="flex items-center gap-3">
      <div
        class="w-10 h-10 rounded-lg flex items-center justify-center"
        :class="iconBgClass"
      >
        <component :is="icon" class="w-5 h-5" :class="iconClass" />
      </div>
      <div>
        <p class="text-2xl font-bold text-gray-900">{{ value }}</p>
        <p class="text-sm text-gray-500">{{ label }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, type Component } from 'vue'

const props = defineProps<{
  icon: Component
  value: number | string
  label: string
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple'
}>()

const colorMap = {
  blue: { bg: 'bg-blue-100', icon: 'text-blue-600' },
  green: { bg: 'bg-green-100', icon: 'text-green-600' },
  yellow: { bg: 'bg-yellow-100', icon: 'text-yellow-600' },
  red: { bg: 'bg-red-100', icon: 'text-red-600' },
  purple: { bg: 'bg-purple-100', icon: 'text-purple-600' }
}

const iconBgClass = computed(() => colorMap[props.color || 'blue'].bg)
const iconClass = computed(() => colorMap[props.color || 'blue'].icon)
</script>
