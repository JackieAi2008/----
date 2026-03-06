<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold">选择任务模板</h3>
        <button @click="$emit('close')" class="p-1 hover:bg-gray-100 rounded">
          <X class="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <!-- 模板列表 -->
      <div v-if="loading" class="py-8 text-center text-gray-500">
        加载中...
      </div>

      <div v-else-if="templates.length === 0" class="py-8 text-center text-gray-500">
        暂无模板，请先创建模板
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="template in templates"
          :key="template.id"
          class="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
          @click="selectTemplate(template)"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <h4 class="font-medium">{{ template.title }}</h4>
                <span
                  :class="[
                    'px-2 py-0.5 text-xs rounded',
                    getPriorityClass(template.priority)
                  ]"
                >
                  {{ getPriorityLabel(template.priority) }}
                </span>
              </div>
              <p v-if="template.description" class="text-sm text-gray-500 mt-1 line-clamp-2">
                {{ template.description }}
              </p>
              <div class="flex items-center gap-3 mt-2 text-xs text-gray-400">
                <span v-if="template.category" class="flex items-center gap-1">
                  <span
                    class="w-2 h-2 rounded-full"
                    :style="{ backgroundColor: template.category.color }"
                  ></span>
                  {{ template.category.name }}
                </span>
              </div>
            </div>
            <button
              @click.stop="handleDelete(template.id)"
              class="p-1 hover:bg-red-100 rounded text-gray-400 hover:text-red-500"
              title="删除模板"
            >
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 中集智历 - 模板列表组件
 */
import { ref, onMounted } from 'vue'
import { X, Trash2 } from 'lucide-vue-next'
import { getTemplates, deleteTemplate } from '@/api/template'
import { devLog } from '@/utils/logger'
import type { TaskTemplate, Priority } from '@/types/task'

const emit = defineEmits<{
  close: []
  select: [template: TaskTemplate]
}>()

const templates = ref<TaskTemplate[]>([])
const loading = ref(true)

// 获取优先级标签
function getPriorityLabel(priority: Priority): string {
  const labels: Record<Priority, string> = {
    HIGH: '高',
    MEDIUM: '中',
    LOW: '低'
  }
  return labels[priority]
}

// 获取优先级样式类
function getPriorityClass(priority: Priority): string {
  const classes: Record<Priority, string> = {
    HIGH: 'bg-red-100 text-red-700',
    MEDIUM: 'bg-yellow-100 text-yellow-700',
    LOW: 'bg-green-100 text-green-700'
  }
  return classes[priority]
}

// 选择模板
function selectTemplate(template: TaskTemplate) {
  emit('select', template)
  emit('close')
}

// 删除模板
async function handleDelete(id: string) {
  if (!confirm('确定要删除此模板吗？')) {
    return
  }

  try {
    await deleteTemplate(id)
    templates.value = templates.value.filter(t => t.id !== id)
  } catch (error) {
    devLog.error('删除模板失败', error)
    alert('删除失败，请稍后重试')
  }
}

// 加载模板列表
async function loadTemplates() {
  loading.value = true
  try {
    templates.value = await getTemplates()
  } catch (error) {
    devLog.error('加载模板失败', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadTemplates()
})
</script>
