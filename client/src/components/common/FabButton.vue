<template>
  <button
    @click="$emit('click')"
    class="fixed bottom-6 right-6 z-40 flex items-center justify-center bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 hover:shadow-xl hover:scale-105 transition-all duration-300"
    :class="expanded ? 'w-auto px-4 h-12 gap-2' : 'w-12 h-12'"
    @mouseenter="expanded = true"
    @mouseleave="expanded = false"
  >
    <Plus class="w-5 h-5 flex-shrink-0 transition-transform duration-300" />
    <span
      class="overflow-hidden whitespace-nowrap font-medium transition-all duration-300"
      :class="expanded ? 'max-w-24 opacity-100' : 'max-w-0 opacity-0'"
    >
      新建任务
    </span>
  </button>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Plus } from 'lucide-vue-next'

defineEmits<{
  click: []
}>()

const expanded = ref(false)
</script>
