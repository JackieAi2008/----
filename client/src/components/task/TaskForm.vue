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
              <!-- 按5个固定分类分组 -->
              <optgroup
                v-for="cat in projectCategories"
                :key="cat.value"
                :label="cat.label"
              >
                <option
                  v-for="project in getProjectsByCategory(cat.value)"
                  :key="project.id"
                  :value="project.id"
                >
                  {{ project.name }}
                </option>
              </optgroup>
              <!-- 未分类项目 -->
              <optgroup v-if="uncategorizedProjects.length > 0" label="其他项目">
                <option
                  v-for="project in uncategorizedProjects"
                  :key="project.id"
                  :value="project.id"
                >
                  {{ project.name }}
                </option>
              </optgroup>
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

        <!-- 核心工作及关键节点（原"任务描述"） -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">核心工作及关键节点</label>
          <textarea
            v-model="form.description"
            class="input"
            rows="3"
            placeholder="请输入核心工作及关键节点"
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
            <optgroup label="项目成员">
              <option v-for="member in members" :key="member.userId" :value="member.userId">
                {{ member.user?.nickname || '未知用户' }}
              </option>
            </optgroup>
          </select>
          <!-- 跨部门搜索（仅项目负责人和管理员可见） -->
          <div v-if="canSearchCrossDept" class="mt-2">
            <details class="group">
              <summary class="text-sm text-blue-600 cursor-pointer hover:text-blue-700">
                搜索其他部门成员
              </summary>
              <div class="mt-2">
                <input
                  v-model="assigneeSearchKeyword"
                  type="text"
                  class="input text-sm"
                  placeholder="输入姓名或邮箱搜索"
                  @input="handleAssigneeSearch"
                />
                <div v-if="assigneeSearchResults.length > 0" class="mt-2 border rounded-lg max-h-32 overflow-y-auto">
                  <div
                    v-for="user in assigneeSearchResults"
                    :key="user.id"
                    class="p-2 flex items-center justify-between hover:bg-gray-50 cursor-pointer"
                    @click="selectCrossDeptAssignee(user)"
                  >
                    <div class="flex items-center gap-2">
                      <div class="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                        <span class="text-xs text-gray-500">{{ user.nickname?.charAt(0) }}</span>
                      </div>
                      <div>
                        <p class="text-xs font-medium">{{ user.nickname }}</p>
                        <p class="text-xs text-gray-400">{{ user.department?.name }}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </details>
          </div>
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
              <option v-for="(info, key) in priorityMap" :key="key" :value="key">
                {{ info.label }}
              </option>
            </select>
          </div>
        </div>

        <!-- 可见性：固定为公开，隐藏选择器 -->

        <!-- 提醒设置 -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">提醒</label>
            <select v-model="form.reminder" class="input">
              <option value="">不提醒</option>
              <option value="TWO_WEEKS">提前两周</option>
              <option value="ONE_WEEK">提前一周</option>
              <option value="THREE_DAYS">提前三天</option>
              <option value="ONE_DAY">提前一天</option>
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

        <!-- 交付成果：下拉选择 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">交付成果</label>
          <select v-model="form.deliverable" class="input">
            <option value="">请选择交付成果</option>
            <option v-for="opt in deliverableOptions" :key="opt" :value="opt">
              {{ opt }}
            </option>
          </select>
        </div>

        <!-- 标签：固定三选 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">标签</label>
          <div class="flex flex-wrap gap-3">
            <label
              v-for="tag in fixedTags"
              :key="tag"
              class="flex items-center gap-2 cursor-pointer"
            >
              <input
                type="checkbox"
                :checked="form.tags.includes(tag)"
                @change="toggleTag(tag)"
                class="rounded text-blue-600"
              />
              <span
                class="px-2 py-1 text-sm rounded-full"
                :class="form.tags.includes(tag) ? getTagColorClass(tag) : 'bg-gray-100 text-gray-500'"
              >
                {{ tag }}
              </span>
            </label>
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
 * 中集智历 - 任务表单组件（优化版）
 * 优化项：
 * - 需求2：任务描述 → 核心工作及关键节点
 * - 需求4：优先级改为四象限
 * - 需求5：可见性固定为公开
 * - 需求6：提醒时间改为两周/一周/三天/一天
 * - 需求7：交付成果改为下拉选择
 * - 需求8：标签固定为三种
 */
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { X, FileText, Plus } from 'lucide-vue-next'
import { useProjectStore } from '@/stores/project'
import { useAuthStore } from '@/stores/auth'
import { getProjectMembers } from '@/api/project'
import { getTaskCategories, createTask, updateTask, getTask, getAllTags } from '@/api/task'
import { createTemplate } from '@/api/template'
import { searchUsers } from '@/api/user'
import { formatDateTime } from '@/utils/date'
import { devLog } from '@/utils/logger'
import { getTagColorClasses } from '@/utils/tagColor'
import TaskTemplateDialog from './TaskTemplateDialog.vue'
import QuickCreateProjectDialog from '@/components/project/QuickCreateProjectDialog.vue'
import {
  PRIORITY_MAP,
  FIXED_TAGS,
  DELIVERABLE_OPTIONS,
  type Priority,
  type Reminder,
  type Repeat,
  type TaskTemplate,
} from '@/types/task'
import { PROJECT_CATEGORY_OPTIONS, type ProjectCategory } from '@/types/project'
import type { ProjectMember } from '@/types/project'
import type { User } from '@/types/user'

const props = defineProps<{
  date?: Date | null
  taskId?: string
}>()

const emit = defineEmits<{
  close: []
  saved: []
}>()

const projectStore = useProjectStore()
const authStore = useAuthStore()

// 常量导出到模板
const priorityMap = PRIORITY_MAP
const fixedTags = FIXED_TAGS
const deliverableOptions = DELIVERABLE_OPTIONS
const projectCategories = PROJECT_CATEGORY_OPTIONS

// 状态
const submitting = ref(false)
const savingTemplate = ref(false)
const members = ref<ProjectMember[]>([])
const categories = ref<{ id: string; name: string; color: string; isSystem: boolean }[]>([])
const availableTags = ref<string[]>([])
const showTemplateDialog = ref(false)
const showQuickCreateProject = ref(false)
const assigneeSearchKeyword = ref('')
const assigneeSearchResults = ref<User[]>([])
let searchTimeout: number | null = null

// 表单数据
const form = reactive({
  title: '',
  projectId: '',
  description: '',
  startDate: '',
  dueDate: '',
  assigneeId: '',
  categoryId: '',
  priority: 'IMPORTANT_URGENT' as Priority,
  visibility: 'PUBLIC' as 'PUBLIC' | 'PRIVATE',  // 固定公开
  reminder: '',
  repeat: '',
  deliverable: '',
  tags: [] as string[]
})

// 计算属性
const projects = computed(() => projectStore.activeProjects)
const isEdit = computed(() => !!props.taskId)
const canSearchCrossDept = computed(() => {
  const currentProject = projects.value.find(p => p.id === form.projectId)
  return authStore.isAdmin || currentProject?.ownerId === authStore.user?.id
})

// 按分类分组项目
function getProjectsByCategory(category: ProjectCategory) {
  return projects.value.filter(p => (p as any).category === category)
}

const uncategorizedProjects = computed(() => {
  const categorizedIds = new Set(
    PROJECT_CATEGORY_OPTIONS.flatMap(cat => getProjectsByCategory(cat.value).map(p => p.id))
  )
  return projects.value.filter(p => !categorizedIds.has(p.id))
})

// 初始化日期（新建任务时默认为点击当天）
watch(() => props.date, (newDate) => {
  if (newDate && !props.taskId) {
    const dateStr = formatDateTime(new Date(newDate), 'YYYY-MM-DD')
    form.startDate = `${dateStr}T00:00`
    form.dueDate = `${dateStr}T00:00`
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

// 跨部门负责人搜索
async function handleAssigneeSearch() {
  if (searchTimeout) clearTimeout(searchTimeout)

  if (assigneeSearchKeyword.value.length < 2) {
    assigneeSearchResults.value = []
    return
  }

  searchTimeout = window.setTimeout(async () => {
    try {
      assigneeSearchResults.value = await searchUsers(assigneeSearchKeyword.value)
    } catch (e) {
      devLog.error('搜索用户失败:', e)
      assigneeSearchResults.value = []
    }
  }, 300)
}

// 选择跨部门负责人
function selectCrossDeptAssignee(user: User) {
  form.assigneeId = user.id
  assigneeSearchKeyword.value = ''
  assigneeSearchResults.value = []
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
      visibility: 'PUBLIC' as const,  // 固定公开
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

function toggleTag(tagName: string) {
  const idx = form.tags.indexOf(tagName)
  if (idx === -1) {
    form.tags.push(tagName)
  } else {
    form.tags.splice(idx, 1)
  }
}

// 应用模板
function applyTemplate(template: TaskTemplate) {
  form.title = template.title
  form.description = template.description || ''
  form.priority = template.priority

  if (template.categoryId) {
    form.categoryId = template.categoryId
  }
}

// 处理快速创建项目成功
async function handleProjectCreated(project: { id: string; name: string }) {
  showQuickCreateProject.value = false
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
    form.projectId = projects.value[0].id
    await handleProjectChange()
  }
})
</script>
