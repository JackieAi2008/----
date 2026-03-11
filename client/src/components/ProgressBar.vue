<template>
  <div class="w-full">
    <div class="flex justify-between text-sm mb-1">
      <span class="text-gray-600 truncate">{{ label }}</span>
      <span class="text-gray-900 font-medium ml-2">{{ progress }}%</span>
    </div>
    <div class="w-full bg-gray-200 rounded-full h-2">
      <div
        class="h-2 rounded-full transition-all duration-300"
        :class="progressClass"
        :style="{ width: `${progress}%` }"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  label?: string
  progress: number
  color?: 'blue' | 'green' | 'yellow' | 'red'
}>()

const colorMap = {
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
  red: 'bg-red-500'
}

const progressClass = computed(() => {
  if (props.color) return colorMap[props.color]
  if (props.progress >= 80) return 'bg-green-500'
  if (props.progress >= 50) return 'bg-blue-500'
  if (props.progress >= 25) return 'bg-yellow-500'
  return 'bg-red-500'
})
</script>
