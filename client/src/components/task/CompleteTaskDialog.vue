<template>
  <div
    class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50"
    @click.self="$emit('cancel')"
  >
    <div class="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-5 md:p-6 shadow-xl sm:mx-4">
      <!-- 头部 -->
      <div class="flex items-center gap-3 mb-4">
        <div class="w-9 h-9 md:w-10 md:h-10 bg-green-100 rounded-xl flex items-center justify-center">
          <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h2 class="text-base md:text-lg font-semibold text-gray-900">完成任务</h2>
          <p class="text-xs text-gray-400 truncate max-w-[200px]">{{ taskTitle }}</p>
        </div>
      </div>

      <!-- 交付成果（必填） -->
      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700 mb-1">
          交付成果 <span class="text-red-500">*</span>
        </label>
        <textarea
          ref="deliverableRef"
          v-model="deliverable"
          rows="3"
          class="w-full px-3 py-2 border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          :class="error ? 'border-red-300 bg-red-50' : 'border-gray-300'"
          placeholder="请描述本次任务的交付成果、产出物..."
          @input="error = ''"
        />
        <p v-if="error" class="text-xs text-red-500 mt-1">{{ error }}</p>
      </div>

      <!-- 完成备注（可选） -->
      <div class="mb-5">
        <label class="block text-sm font-medium text-gray-700 mb-1">
          完成备注 <span class="text-gray-400 text-xs">(可选)</span>
        </label>
        <textarea
          v-model="completionNote"
          rows="2"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="补充说明完成过程中的情况、遗留问题等..."
        />
      </div>

      <!-- 按钮 -->
      <div class="flex justify-end gap-3">
        <button
          @click="$emit('cancel')"
          class="px-4 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-sm"
        >
          取消
        </button>
        <button
          @click="handleConfirm"
          :disabled="submitting"
          class="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors shadow-sm text-sm flex items-center gap-2"
        >
          <svg v-if="submitting" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {{ submitting ? '提交中...' : '确认完成' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'

const props = defineProps<{
  taskTitle: string
  existingDeliverable?: string | null
  submitting?: boolean
}>()

const emit = defineEmits<{
  confirm: [data: { deliverable: string; completionNote: string }]
  cancel: []
}>()

const deliverable = ref(props.existingDeliverable || '')
const completionNote = ref('')
const error = ref('')
const deliverableRef = ref<HTMLTextAreaElement>()

onMounted(async () => {
  await nextTick()
  deliverableRef.value?.focus()
})

function handleConfirm() {
  if (!deliverable.value.trim()) {
    error.value = '请填写交付成果'
    deliverableRef.value?.focus()
    return
  }
  emit('confirm', {
    deliverable: deliverable.value.trim(),
    completionNote: completionNote.value.trim()
  })
}
</script>
