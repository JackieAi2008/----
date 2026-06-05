<template>
  <div v-if="visible" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg p-6 w-full max-w-md mx-4">
      <h3 class="text-lg font-semibold mb-4">导出数据</h3>

      <form @submit.prevent="handleExport">
        <!-- 导出格式 -->
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">导出格式</label>
          <div class="grid grid-cols-2 gap-2">
            <label
              v-for="format in formats"
              :key="format.value"
              :class="[
                'flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors',
                selectedFormat === format.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              ]"
            >
              <input
                type="radio"
                v-model="selectedFormat"
                :value="format.value"
                class="sr-only"
              />
              <component :is="format.icon" class="w-5 h-5" :class="format.color" />
              <div>
                <div class="font-medium text-sm">{{ format.label }}</div>
                <div class="text-xs text-gray-500">{{ format.description }}</div>
              </div>
            </label>
          </div>
        </div>

        <!-- 时间范围（非PDF格式） -->
        <div v-if="selectedFormat !== 'pdf'" class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">时间范围（可选）</label>
          <div class="flex gap-2">
            <input
              v-model="startDate"
              type="date"
              class="input flex-1"
              placeholder="开始日期"
            />
            <span class="text-gray-400 self-center">至</span>
            <input
              v-model="endDate"
              type="date"
              class="input flex-1"
              placeholder="结束日期"
            />
          </div>
        </div>

        <!-- 报告类型（PDF格式） -->
        <div v-if="selectedFormat === 'pdf'" class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">报告类型</label>
          <select v-model="summaryType" class="input w-full">
            <option value="weekly">周报</option>
            <option value="monthly">月报</option>
            <option value="quarterly">季报</option>
            <option value="yearly">年报</option>
          </select>
        </div>

        <!-- 项目筛选 -->
        <div v-if="selectedFormat !== 'pdf'" class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">项目筛选（可选）</label>
          <select v-model="selectedProject" class="input w-full">
            <option value="">全部项目</option>
            <option v-for="project in projects" :key="project.id" :value="project.id">
              {{ project.name }}
            </option>
          </select>
        </div>

        <!-- 状态筛选（Excel格式） -->
        <div v-if="selectedFormat === 'excel'" class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">状态筛选（可选）</label>
          <select v-model="selectedStatus" class="input w-full">
            <option value="">全部状态</option>
            <option value="TODO">待办</option>
            <option value="IN_PROGRESS">进行中</option>
            <option value="DONE">已完成</option>
            <option value="CANCELLED">已取消</option>
          </select>
        </div>

        <!-- 按钮组 -->
        <div class="flex justify-end gap-3 mt-6">
          <button
            type="button"
            @click="handleClose"
            class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            取消
          </button>
          <button
            type="submit"
            :disabled="exporting"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            <Loader2 v-if="exporting" class="w-4 h-4 animate-spin" />
            {{ exporting ? '导出中...' : '导出' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 中集智历 - 导出对话框组件
 */
import { ref, watch } from 'vue'
import { Calendar, FileSpreadsheet, FileText, Loader2 } from 'lucide-vue-next'
import {
  downloadICS,
  downloadExcel,
  downloadPDF,
  type ExportParams
} from '@/api/export'
import type { Project } from '@/types/project'

// Props
interface Props {
  visible: boolean
  projects?: Project[]
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  projects: () => []
})

// Emits
const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'exported'): void
}>()

// 格式选项
const formats = [
  {
    value: 'ics',
    label: '日历文件',
    description: '导入手机/电脑日历',
    icon: Calendar,
    color: 'text-orange-500'
  },
  {
    value: 'excel',
    label: 'Excel表格',
    description: '任务列表表格',
    icon: FileSpreadsheet,
    color: 'text-green-500'
  },
  {
    value: 'pdf',
    label: '工作总结',
    description: '周报/月报/季报',
    icon: FileText,
    color: 'text-red-500'
  }
]

// 状态
const selectedFormat = ref('ics')
const startDate = ref('')
const endDate = ref('')
const summaryType = ref<'weekly' | 'monthly' | 'quarterly' | 'yearly'>('weekly')
const selectedProject = ref('')
const selectedStatus = ref('')
const exporting = ref(false)

// 重置表单
function resetForm() {
  selectedFormat.value = 'ics'
  startDate.value = ''
  endDate.value = ''
  summaryType.value = 'weekly'
  selectedProject.value = ''
  selectedStatus.value = ''
}

// 关闭对话框
function handleClose() {
  emit('update:visible', false)
  resetForm()
}

// 执行导出
async function handleExport() {
  exporting.value = true

  try {
    const params: ExportParams = {}

    if (startDate.value) params.startDate = startDate.value
    if (endDate.value) params.endDate = endDate.value
    if (selectedProject.value) params.projectId = selectedProject.value
    if (selectedStatus.value) params.status = selectedStatus.value
    if (summaryType.value) params.summaryType = summaryType.value

    switch (selectedFormat.value) {
      case 'ics':
        await downloadICS(params)
        break
      case 'excel':
        await downloadExcel(params)
        break
      case 'pdf':
        await downloadPDF(params)
        break
    }

    emit('exported')
    handleClose()
  } catch (error) {
    console.error('导出失败:', error)
    alert('导出失败，请稍后重试')
  } finally {
    exporting.value = false
  }
}

// 监听对话框打开重置表单
watch(() => props.visible, (newVal) => {
  if (newVal) {
    resetForm()
  }
})
</script>
