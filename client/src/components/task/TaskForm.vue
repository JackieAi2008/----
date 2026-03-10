<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold">{{ isEdit ? '编辑任务' : '新建任务' }}</h3>
        <button @click="$emit('close')" class="p-1 hover:bg-gray-100 rounded">
          <X class="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <!-- 从模板创建按钮 -->
      <div v-if="!isEdit" class="mb-4">
        <button
          type="button"
          @click="showTemplateDialog = true"
          class="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
        >
          <FileText class="w-4 h-4" />
          从模板创建
        </button>
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <!-- 任务标题 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            任务标题 <span class="text-red-500">*</span>
          </label>
          <input
            v-model="form.title"
            type="text"
            class="input"
            placeholder="请输入任务标题"
            required
          />
        </div>

        <!-- 所属项目 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            所属项目 <span class="text-red-500">*</span>
          </label>
          <div class="flex gap-2">
            <select v-model="form.projectId" class="input flex-1" required @change="handleProjectChange">
              <option value="">请选择项目</option>
              <option v-for="project in projects" :key="project.id" :value="project.id">
                {{ project.name }}
              </option>
            </select>
            <button
              type="button"
              @click="showQuickCreateProject = true"
              class="px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="新建项目"
            >
              <Plus class="w-5 h-5" />
            </button>
          </div>
        </div>

        <!-- 任务描述 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">任务描述</label>
          <textarea
            v-model="form.description"
            class="input"
            rows="3"
            placeholder="请输入任务描述"
          ></textarea>
        </div>

        <!-- 时间设置 -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">开始时间</label>
            <input
              v-model="form.startDate"
              type="datetime-local"
              class="input"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              截止时间 <span class="text-red-500">*</span>
            </label>
            <input
              v-model="form.dueDate"
              type="datetime-local"
              class="input"
              required
            />
          </div>
        </div>

        <!-- 负责人 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            负责人 <span class="text-red-500">*</span>
          </label>
          <select v-model="form.assigneeId" class="input" required>
            <option value="">请选择负责人</option>
            <option v-for="member in members" :key="member.userId" :value="member.userId">
              {{ member.user?.nickname || '未知用户' }}
            </option>
          </select>
        </div>

        <!-- 类别和优先级 -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">任务类别</label>
            <select v-model="form.categoryId" class="input">
              <option value="">无类别</option>
              <option
                v-for="category in categories"
                :key="category.id"
                :value="category.id"
              >
                {{ category.name }}
              </option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">优先级</label>
            <select v-model="form.priority" class="input">
              <option value="LOW">低</option>
              <option value="MEDIUM">中</option>
              <option value="HIGH">高</option>
            </select>
          </div>
        </div>

        <!-- 提醒设置 -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">提醒</label>
            <select v-model="form.reminder" class="input">
              <option value="">不提醒</option>
              <option value="FIFTEEN_MIN">提前15分钟</option>
              <option value="ONE_HOUR">提前1小时</option>
              <option value="ONE_DAY">提前1天</option>
              <option value="THREE_DAYS">提前3天</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">重复</label>
            <select v-model="form.repeat" class="input">
              <option value="">不重复</option>
              <option value="DAILY">每天</option>
              <option value="WEEKLY">每周</option>
              <option value="MONTHLY">每月</option>
              <option value="YEARLY">每年</option>
            </select>
          </div>
        </div>

        <!-- 交付成果 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">交付成果</label>
          <input
            v-model="form.deliverable"
            type="text"
            class="input"
            placeholder="请输入需要提交的产出物"
          />
        </div>

        <!-- 标签 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">标签</label>
          <div class="space-y-2">
            <!-- 已选标签 -->
            <div v-if="form.tags.length > 0" class="flex flex-wrap gap-2">
              <span
                v-for="tag in form.tags"
                :key="tag"
                class="inline-flex items-center gap-1 px-2 py-1 text-sm rounded-full"
                :class="getTagColorClass(tag)"
              >
                {{ tag }}
                <button
                  type="button"
                  @click="removeTag(tag)"
                  class="hover:opacity-70"
                >
                  <X class="w-3 h-3" />
                </button>
              </span>
            </div>
            <!-- 标签输入 -->
            <div class="flex gap-2">
              <input
                v-model="newTagInput"
                type="text"
                class="input flex-1"
                placeholder="输入标签名后按回车添加"
                maxlength="20"
                @keydown.enter.prevent="addTag"
              />
              <button
                type="button"
                @click="addTag"
                :disabled="!newTagInput.trim()"
                class="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                添加
              </button>
            </div>
            <!-- 可选标签 -->
            <div v-if="availableTags.length > 0" class="flex flex-wrap gap-1">
              <span class="text-xs text-gray-500 mr-1">快速选择:</span>
              <button
                v-for="tag in availableTags"
                :key="tag"
                type="button"
                @click="selectTag(tag)"
                :disabled="form.tags.includes(tag)"
                class="px-2 py-0.5 text-xs rounded-full transition-colors"
                :class="[
                  getTagColorClass(tag),
                  form.tags.includes(tag) ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'
                ]"
              >
                {{ tag }}
              </button>
            </div>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="flex justify-between gap-3 pt-4">
          <button
            type="button"
            @click="handleSaveAsTemplate"
            :disabled="!form.title || savingTemplate"
            class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ savingTemplate ? '保存中...' : '保存为模板' }}
          </button>
          <div class="flex gap-3">
            <button
              type="button"
              @click="$emit('close')"
              class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              取消
            </button>
            <button
              type="submit"
              :disabled="submitting"
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {{ submitting ? '保存中...' : (isEdit ? '更新' : '创建') }}
            </button>
          </div>
        </div>
      </form>

      <!-- 模板选择对话框 -->
      <TaskTemplateDialog
        v-if="showTemplateDialog"
        @close="showTemplateDialog = false"
        @select="applyTemplate"
      />

      <!-- 快速创建项目对话框 -->
      <QuickCreateProjectDialog
        v-if="showQuickCreateProject"
        @close="showQuickCreateProject = false"
        @saved="handleProjectCreated"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 中集智历 - 任务表单组件
 */
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { X, FileText, Plus } from 'lucide-vue-next'
import { useProjectStore } from '@/stores/project'
import { getProjectMembers } from '@/api/project'
import { getTaskCategories, createTask, updateTask, getTask, getAllTags } from '@/api/task'
import { createTemplate } from '@/api/template'
import { formatDateTime } from '@/utils/date'
import { devLog } from '@/utils/logger'
import { getTagColorClasses } from '@/utils/tagColor'
import TaskTemplateDialog from './TaskTemplateDialog.vue'
import QuickCreateProjectDialog from '@/components/project/QuickCreateProjectDialog.vue'
import type { TaskCategory, Reminder, Repeat, TaskTemplate } from '@/types/task'
import type { ProjectMember } from '@/types/project'

const props = defineProps<{
  date?: Date | null
  taskId?: string
}>()

const emit = defineEmits<{
  close: []
  saved: []
}>()

const projectStore = useProjectStore()

// 状态
const submitting = ref(false)
const savingTemplate = ref(false)
const members = ref<ProjectMember[]>([])
const categories = ref<TaskCategory[]>([])
const availableTags = ref<string[]>([])
const newTagInput = ref('')
const showTemplateDialog = ref(false)
const showQuickCreateProject = ref(false)

// 表单数据
const form = reactive({
  title: '',
  projectId: '',
  description: '',
  startDate: '',
  dueDate: '',
  assigneeId: '',
  categoryId: '',
  priority: 'MEDIUM' as 'HIGH' | 'MEDIUM' | 'LOW',
  reminder: '',
  repeat: '',
  deliverable: '',
  tags: [] as string[]
})

// 计算属性
const projects = computed(() => projectStore.activeProjects)
const isEdit = computed(() => !!props.taskId)

// 初始化截止日期
watch(() => props.date, (newDate) => {
  if (newDate && !props.taskId) {
    // 设置默认截止时间为当天18:00
    const dueDate = new Date(newDate)
    dueDate.setHours(18, 0, 0, 0)
    form.dueDate = formatDateTime(dueDate, 'YYYY-MM-DDTHH:mm')
  }
}, { immediate: true })

// 项目变化时获取成员和类别
async function handleProjectChange() {
  if (!form.projectId) {
    members.value = []
    categories.value = []
    availableTags.value = []
    return
  }

  try {
    const [membersRes, categoriesRes, tagsRes] = await Promise.all([
      getProjectMembers(form.projectId),
      getTaskCategories(form.projectId),
      getAllTags(form.projectId)
    ])
    members.value = membersRes
    categories.value = categoriesRes
    availableTags.value = tagsRes

    // 默认选择当前用户作为负责人
    const currentUserId = localStorage.getItem('userId')
    if (currentUserId && membersRes.some(m => m.userId === currentUserId)) {
      form.assigneeId = currentUserId
    } else if (membersRes.length > 0) {
      form.assigneeId = membersRes[0].userId
    }
  } catch (error) {
    devLog.error('获取项目数据失败', error)
  }
}

// 加载任务数据（编辑模式）
async function loadTask() {
  if (!props.taskId) return

  try {
    const task = await getTask(props.taskId)
    form.title = task.title
    form.projectId = task.projectId
    form.description = task.description || ''
    form.startDate = task.startDate ? formatDateTime(task.startDate, 'YYYY-MM-DDTHH:mm') : ''
    form.dueDate = formatDateTime(task.dueDate, 'YYYY-MM-DDTHH:mm')
    form.assigneeId = task.assigneeId
    form.categoryId = task.categoryId || ''
    form.priority = task.priority
    form.reminder = task.reminder || ''
    form.repeat = task.repeat || ''
    form.deliverable = task.deliverable || ''
    form.tags = task.tags || []

    // 加载项目成员
    await handleProjectChange()
  } catch (error) {
    devLog.error('加载任务失败', error)
  }
}

// 提交表单
async function handleSubmit() {
  submitting.value = true

  try {
    const data = {
      title: form.title,
      projectId: form.projectId,
      description: form.description || undefined,
      startDate: form.startDate || undefined,
      dueDate: form.dueDate,
      assigneeId: form.assigneeId,
      categoryId: form.categoryId || undefined,
      priority: form.priority,
      reminder: (form.reminder || undefined) as Reminder | undefined,
      repeat: (form.repeat || undefined) as Repeat | undefined,
      deliverable: form.deliverable || undefined,
      tags: form.tags.length > 0 ? form.tags : undefined
    }

    if (isEdit.value) {
      await updateTask(props.taskId!, data)
    } else {
      await createTask(data)
    }

    emit('saved')
  } catch (error) {
    devLog.error('保存任务失败', error)
    alert('保存失败，请稍后重试')
  } finally {
    submitting.value = false
  }
}

// 标签相关方法
function getTagColorClass(tagName: string): string {
  const colors = getTagColorClasses(tagName)
  return `${colors.bg} ${colors.text}`
}

function addTag() {
  const tagName = newTagInput.value.trim()
  if (!tagName) return
  if (form.tags.includes(tagName)) {
    newTagInput.value = ''
    return
  }
  form.tags.push(tagName)
  newTagInput.value = ''
}

function removeTag(tagName: string) {
  form.tags = form.tags.filter(t => t !== tagName)
}

function selectTag(tagName: string) {
  if (!form.tags.includes(tagName)) {
    form.tags.push(tagName)
  }
}

// 应用模板
function applyTemplate(template: TaskTemplate) {
  // 填充表单字段
  form.title = template.title
  form.description = template.description || ''
  form.priority = template.priority

  // 如果模板有类别，设置为模板的类别
  if (template.categoryId) {
    form.categoryId = template.categoryId
  }
}

// 处理快速创建项目成功
async function handleProjectCreated(project: { id: string; name: string }) {
  showQuickCreateProject.value = false
  // 自动选中新项目
  form.projectId = project.id
  await handleProjectChange()
}

// 保存为模板
async function handleSaveAsTemplate() {
  if (!form.title) {
    alert('请先输入任务标题')
    return
  }

  savingTemplate.value = true
  try {
    await createTemplate({
      title: form.title,
      description: form.description || undefined,
      priority: form.priority,
      categoryId: form.categoryId || undefined,
      defaultAssignee: form.assigneeId || undefined
    })
    alert('模板保存成功')
  } catch (error) {
    devLog.error('保存模板失败', error)
    alert('保存模板失败，请稍后重试')
  } finally {
    savingTemplate.value = false
  }
}

// 初始化
onMounted(async () => {
  await projectStore.fetchProjects()

  if (isEdit.value) {
    await loadTask()
  } else if (projects.value.length === 1) {
    // 如果只有一个项目，自动选中
    form.projectId = projects.value[0].id
    await handleProjectChange()
  }
})
</script>
