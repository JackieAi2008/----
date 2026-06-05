<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold">任务模板</h3>
        <button @click="$emit('close')" class="p-1 hover:bg-gray-100 rounded">
          <X class="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <!-- 加载中 -->
      <div v-if="loading" class="flex justify-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>

      <!-- 模板列表 -->
      <div v-else-if="templates.length > 0" class="space-y-3">
        <div
          v-for="template in templates"
          :key="template.id"
          class="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
          :class="{ 'ring-2 ring-blue-500 bg-blue-50': selectedId === template.id }"
          @click="selectTemplate(template)"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <h4 class="font-medium text-gray-900">{{ template.title }}</h4>
                <span
                  :class="{
                    'bg-red-100 text-red-700': template.priority === 'IMPORTANT_URGENT',
                    'bg-blue-100 text-blue-700': template.priority === 'IMPORTANT_NOT_URGENT',
                    'bg-orange-100 text-orange-700': template.priority === 'URGENT_NOT_IMPORTANT',
                    'bg-gray-100 text-gray-600': template.priority === 'NOT_IMPORTANT_NOT_URGENT'
                  }"
                  class="text-xs px-2 py-0.5 rounded"
                >
                  {{ priorityLabel(template.priority) }}
                </span>
              </div>
              <p v-if="template.description" class="text-sm text-gray-500 mt-1">
                {{ template.description }}
              </p>
              <div class="flex items-center gap-4 mt-2 text-xs text-gray-400">
                <span v-if="template.category" class="flex items-center gap-1">
                  <span
                    class="w-2 h-2 rounded-full"
                    :style="{ backgroundColor: template.category.color }"
                  ></span>
                  {{ template.category.name }}
                </span>
                <span>{{ formatDate(template.createdAt) }} 创建</span>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button
                @click.stop="editTemplate(template)"
                class="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                title="编辑模板"
              >
                <Pencil class="w-4 h-4" />
              </button>
              <button
                @click.stop="confirmDelete(template)"
                class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                title="删除模板"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else class="text-center py-8">
        <FileText class="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p class="text-gray-500">暂无任务模板</p>
        <button
          @click="showCreateForm = true"
          class="mt-3 text-blue-600 hover:text-blue-700 text-sm"
        >
          创建第一个模板
        </button>
      </div>

      <!-- 底部按钮 -->
      <div v-if="templates.length > 0" class="flex justify-between items-center mt-6 pt-4 border-t">
        <button
          @click="showCreateForm = true"
          class="flex items-center gap-1 text-blue-600 hover:text-blue-700"
        >
          <Plus class="w-4 h-4" />
          新建模板
        </button>
        <div class="flex gap-3">
          <button
            @click="$emit('close')"
            class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            取消
          </button>
          <button
            @click="applyTemplate"
            :disabled="!selectedId"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            应用模板
          </button>
        </div>
      </div>

      <!-- 创建/编辑模板表单 -->
      <div
        v-if="showCreateForm"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      >
        <div class="bg-white rounded-lg p-6 w-full max-w-md">
          <h4 class="text-lg font-semibold mb-4">
            {{ editingTemplate ? '编辑模板' : '新建模板' }}
          </h4>
          <form @submit.prevent="saveTemplate" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                模板标题 <span class="text-red-500">*</span>
              </label>
              <input
                v-model="templateForm.title"
                type="text"
                class="input"
                placeholder="请输入模板标题"
                required
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">描述</label>
              <textarea
                v-model="templateForm.description"
                class="input"
                rows="3"
                placeholder="请输入模板描述"
              ></textarea>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">优先级</label>
              <select v-model="templateForm.priority" class="input">
                <option value="IMPORTANT_URGENT">重要且紧急</option>
                <option value="IMPORTANT_NOT_URGENT">重要不紧急</option>
                <option value="URGENT_NOT_IMPORTANT">紧急不重要</option>
                <option value="NOT_IMPORTANT_NOT_URGENT">不重要不紧急</option>
              </select>
            </div>
            <div class="flex justify-end gap-3 pt-4">
              <button
                type="button"
                @click="cancelEdit"
                class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                取消
              </button>
              <button
                type="submit"
                :disabled="saving"
                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {{ saving ? '保存中...' : '保存' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- 删除确认 -->
      <div
        v-if="deletingTemplate"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      >
        <div class="bg-white rounded-lg p-6 w-full max-w-sm">
          <h4 class="text-lg font-semibold mb-2">确认删除</h4>
          <p class="text-gray-600 mb-4">
            确定要删除模板"{{ deletingTemplate.title }}"吗？此操作无法撤销。
          </p>
          <div class="flex justify-end gap-3">
            <button
              @click="deletingTemplate = null"
              class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              取消
            </button>
            <button
              @click="deleteTemplate"
              :disabled="deleting"
              class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {{ deleting ? '删除中...' : '删除' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 中集智历 - 任务模板管理对话框
 */
import { ref, reactive, onMounted } from 'vue'
import { X, Plus, Pencil, Trash2, FileText } from 'lucide-vue-next'
import {
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate as deleteTemplateApi
} from '@/api/template'
import type { TaskTemplate, Priority } from '@/types/task'
import { devLog } from '@/utils/logger'

const emit = defineEmits<{
  close: []
  select: [template: TaskTemplate]
}>()

// 状态
const loading = ref(true)
const templates = ref<TaskTemplate[]>([])
const selectedId = ref<string | null>(null)
const showCreateForm = ref(false)
const editingTemplate = ref<TaskTemplate | null>(null)
const saving = ref(false)
const deleting = ref(false)
const deletingTemplate = ref<TaskTemplate | null>(null)

// 表单数据
const templateForm = reactive({
  title: '',
  description: '',
  priority: 'IMPORTANT_URGENT' as Priority
})

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

// 选择模板
function selectTemplate(template: TaskTemplate) {
  selectedId.value = template.id
}

// 优先级标签
function priorityLabel(priority: Priority): string {
  const labels: Record<Priority, string> = {
    IMPORTANT_URGENT: '重要且紧急',
    IMPORTANT_NOT_URGENT: '重要不紧急',
    URGENT_NOT_IMPORTANT: '紧急不重要',
    NOT_IMPORTANT_NOT_URGENT: '不重要不紧急'
  }
  return labels[priority]
}

// 格式化日期
function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// 编辑模板
function editTemplate(template: TaskTemplate) {
  editingTemplate.value = template
  templateForm.title = template.title
  templateForm.description = template.description || ''
  templateForm.priority = template.priority
  showCreateForm.value = true
}

// 取消编辑
function cancelEdit() {
  showCreateForm.value = false
  editingTemplate.value = null
  templateForm.title = ''
  templateForm.description = ''
  templateForm.priority = 'IMPORTANT_URGENT'
}

// 保存模板
async function saveTemplate() {
  saving.value = true
  try {
    if (editingTemplate.value) {
      // 更新模板
      const updated = await updateTemplate(editingTemplate.value.id, {
        title: templateForm.title,
        description: templateForm.description || undefined,
        priority: templateForm.priority
      })
      // 更新列表中的模板
      const index = templates.value.findIndex(t => t.id === updated.id)
      if (index !== -1) {
        templates.value[index] = updated
      }
    } else {
      // 创建新模板
      const created = await createTemplate({
        title: templateForm.title,
        description: templateForm.description || undefined,
        priority: templateForm.priority
      })
      templates.value.unshift(created)
    }
    cancelEdit()
  } catch (error) {
    devLog.error('保存模板失败', error)
    alert('保存失败，请稍后重试')
  } finally {
    saving.value = false
  }
}

// 确认删除
function confirmDelete(template: TaskTemplate) {
  deletingTemplate.value = template
}

// 删除模板
async function deleteTemplate() {
  if (!deletingTemplate.value) return

  deleting.value = true
  try {
    await deleteTemplateApi(deletingTemplate.value.id)
    templates.value = templates.value.filter(t => t.id !== deletingTemplate.value!.id)
    if (selectedId.value === deletingTemplate.value.id) {
      selectedId.value = null
    }
    deletingTemplate.value = null
  } catch (error) {
    devLog.error('删除模板失败', error)
    alert('删除失败，请稍后重试')
  } finally {
    deleting.value = false
  }
}

// 应用模板
function applyTemplate() {
  const template = templates.value.find(t => t.id === selectedId.value)
  if (template) {
    emit('select', template)
    emit('close')
  }
}

// 初始化
onMounted(() => {
  loadTemplates()
})
</script>
