<template>
  <div class="flex items-center gap-1">
    <!-- 年份选择器 -->
    <div class="relative" ref="yearDropdownRef">
      <button
        @click="showYearPicker = !showYearPicker"
        class="flex items-center gap-1 px-2 py-1 text-lg font-semibold text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
      >
        {{ year }}年
        <ChevronDown class="w-4 h-4 text-gray-500" />
      </button>

      <!-- 年份下拉面板 -->
      <Transition name="dropdown">
        <div
          v-if="showYearPicker"
          class="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 p-2 z-50 w-52"
        >
          <div class="flex items-center justify-between mb-2 px-2">
            <button @click="yearPage--" class="p-1 hover:bg-gray-100 rounded">
              <ChevronLeft class="w-4 h-4" />
            </button>
            <span class="text-sm text-gray-500">{{ yearRange }}</span>
            <button @click="yearPage++" class="p-1 hover:bg-gray-100 rounded">
              <ChevronRight class="w-4 h-4" />
            </button>
          </div>
          <div class="grid grid-cols-4 gap-1">
            <button
              v-for="y in yearOptions"
              :key="y"
              @click="selectYear(y)"
              class="px-2 py-1.5 text-sm rounded-md transition-colors"
              :class="y === year ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'"
            >
              {{ y }}
            </button>
          </div>
        </div>
      </Transition>
    </div>

    <!-- 月份选择器 -->
    <div class="relative" ref="monthDropdownRef">
      <button
        @click="showMonthPicker = !showMonthPicker"
        class="flex items-center gap-1 px-2 py-1 text-lg font-semibold text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
      >
        {{ month }}月
        <ChevronDown class="w-4 h-4 text-gray-500" />
      </button>

      <!-- 月份下拉面板 -->
      <Transition name="dropdown">
        <div
          v-if="showMonthPicker"
          class="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 p-2 z-50 w-40"
        >
          <div class="grid grid-cols-3 gap-1">
            <button
              v-for="m in 12"
              :key="m"
              @click="selectMonth(m)"
              class="px-2 py-2 text-sm rounded-md transition-colors"
              :class="m === month ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'"
            >
              {{ m }}月
            </button>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-vue-next'

const props = defineProps<{
  year: number
  month: number
}>()

const emit = defineEmits<{
  'update:year': [value: number]
  'update:month': [value: number]
}>()

const showYearPicker = ref(false)
const showMonthPicker = ref(false)
const yearPage = ref(0)
const yearDropdownRef = ref<HTMLElement | null>(null)
const monthDropdownRef = ref<HTMLElement | null>(null)

const yearRange = computed(() => {
  const start = props.year + yearPage.value * 12 - 6
  return `${start} - ${start + 11}`
})

const yearOptions = computed(() => {
  const start = props.year + yearPage.value * 12 - 6
  return Array.from({ length: 12 }, (_, i) => start + i)
})

function selectYear(y: number) {
  emit('update:year', y)
  showYearPicker.value = false
  yearPage.value = 0
}

function selectMonth(m: number) {
  emit('update:month', m)
  showMonthPicker.value = false
}

// 点击外部关闭下拉
function handleClickOutside(event: MouseEvent) {
  if (yearDropdownRef.value && !yearDropdownRef.value.contains(event.target as Node)) {
    showYearPicker.value = false
    yearPage.value = 0
  }
  if (monthDropdownRef.value && !monthDropdownRef.value.contains(event.target as Node)) {
    showMonthPicker.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
