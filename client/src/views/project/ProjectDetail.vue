<template>
  <div>
    <!-- 加载中 -->
    <div v-if="projectStore.loading" class="text-center py-12 text-gray-500">
      加载中...
    </div>

    <template v-else-if="project">
      <!-- 项目头部 -->
      <div class="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 mb-4 sm:mb-6">
        <div class="flex flex-col sm:flex-row items-start justify-between gap-4">
          <div>
            <h2 class="text-xl sm:text-2xl font-bold text-gray-800">{{ project.name }}</h2>
            <p v-if="project.description" class="text-sm sm:text-base text-gray-500 mt-2">{{ project.description }}</p>
            <div class="flex items-center gap-4 mt-4">
              <span
                v-if="project.category"
                class="px-2 py-1 rounded-full text-xs bg-indigo-100 text-indigo-700"
              >
                {{ PROJECT_CATEGORY_MAP[project.category] || '未分类' }}
              </span>
              <span
                class="px-2 py-1 rounded-full text-xs"
                :class="project.visibility === 'PUBLIC' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'"
              >
                {{ project.visibility === 'PUBLIC' ? '公开' : '私密' }}
              </span>
              <span class="text-sm text-gray-500">
                创建于 {{ formatDate(project.createdAt) }}
              </span>
            </div>
          </div>
          <div class="flex flex-wrap gap-2">
            <button
              v-if="isOwner"
              @click="openEditDialog"
              class="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              编辑
            </button>
            <button
              v-if="isOwner"
              @click="openTransferDialog"
              class="px-3 py-1 text-sm border border-orange-300 text-orange-600 rounded-lg hover:bg-orange-50"
            >
              移交项目
            </button>
          </div>
        </div>
      </div>

      <!-- 成员列表 -->
      <div class="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 mb-4 sm:mb-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-base sm:text-lg font-semibold">项目成员</h3>
          <button
            v-if="isOwner"
            @click="openAddMemberDialog"
            class="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus class="w-4 h-4" />
            添加成员
          </button>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div
            v-for="member in members"
            :key="member.id"
            class="flex items-center justify-between gap-3 p-3 rounded-lg border border-gray-200"
          >
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                <User class="w-5 h-5 text-gray-500" />
              </div>
              <div class="min-w-0">
                <p class="font-medium text-gray-800 truncate">{{ member.user?.nickname }}</p>
                <p class="text-xs text-gray-500">{{ member.role === 'OWNER' ? '负责人' : '成员' }}</p>
              </div>
            </div>
            <button
              v-if="isOwner && member.role !== 'OWNER'"
              @click="handleRemoveMember(member)"
              class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all flex-shrink-0"
              title="移除成员"
            >
              <X class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <!-- 任务列表 -->
      <div class="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4">
          <div>
            <h3 class="text-base sm:text-lg font-semibold text-gray-800">任务列表</h3>
            <p class="text-sm text-gray-500 mt-1">
              共 {{ taskStats.total }} 个任务 · 已完成 {{ taskStats.done }} · 进行中 {{ taskStats.inProgress }}
            </p>
          </div>
          <div class="flex items-center gap-3">
            <!-- 进度条 -->
            <div v-if="taskStats.total > 0" class="hidden sm:block w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                class="h-full bg-green-500 rounded-full transition-all duration-300"
                :style="{ width: `${(taskStats.done / taskStats.total) * 100}%` }"
              ></div>
            </div>
            <button
              @click="showCreateTask = true"
              class="flex items-center justify-center gap-2 px-3 py-1.5 sm:py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus class="w-4 h-4" />
              新建任务
            </button>
          </div>
        </div>

        <div v-if="tasks.length === 0" class="text-center py-8 text-gray-500">
          暂无任务
        </div>
        <div v-else class="space-y-3">
          <div
            v-for="task in tasks"
            :key="task.id"
            class="group p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer flex items-center justify-between"
            @click="goToTask(task.id)"
          >
            <div class="flex-1">
              <h4 class="font-medium text-gray-800">{{ task.title }}</h4>
              <div class="flex items-center gap-4 mt-1">
                <p class="text-sm text-gray-500">
                  截止日期：{{ formatDateTime(task.dueDate) }}
                </p>
                <p v-if="task.assignee" class="text-sm text-gray-500">
                  负责人：{{ task.assignee.nickname }}
                  <span v-if="task.assignee.department" class="text-xs text-gray-400">
                    [{{ task.assignee.department.name }}]
                  </span>
                </p>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <span
                class="px-2 py-1 rounded text-xs"
                :class="getStatusClass(task.status)"
              >
                {{ getStatusText(task.status) }}
              </span>
              <button
                @click.stop="confirmDeleteTask(task)"
                class="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                title="删除任务"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- 不存在 -->
    <div v-else class="text-center py-12 text-gray-500">
      项目不存在
    </div>

    <!-- 编辑项目弹窗 -->
    <div v-if="showEditProject" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h3 class="text-lg font-semibold mb-4">编辑项目</h3>
        <form @submit.prevent="handleEditProject">
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">项目名称</label>
              <input
                v-model="editForm.name"
                type="text"
                class="input w-full"
                placeholder="请输入项目名称"
                required
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">项目描述</label>
              <textarea
                v-model="editForm.description"
                class="input w-full"
                rows="3"
                placeholder="请输入项目描述"
              ></textarea>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">可见性</label>
              <select v-model="editForm.visibility" class="input w-full">
                <option value="PUBLIC">公开</option>
                <option value="PRIVATE">私密</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                项目分类 <span class="text-red-500">*</span>
              </label>
              <select v-model="editForm.category" class="input w-full" required>
                <option value="" disabled>请选择分类</option>
                <option v-for="cat in categoryOptions" :key="cat.value" :value="cat.value">{{ cat.label }}</option>
              </select>
            </div>
          </div>
          <div class="flex justify-end gap-3 mt-6">
            <button
              type="button"
              @click="showEditProject = false"
              class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
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

    <!-- 添加成员弹窗（部门成员列表） -->
    <div v-if="showAddMember" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold">添加成员</h3>
          <button @click="showAddMember = false" class="p-1 hover:bg-gray-100 rounded transition-colors">
            <X class="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <!-- 加载中 -->
        <div v-if="loadingDeptMembers" class="text-center py-8 text-gray-500">
          <div class="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3"></div>
          加载部门成员...
        </div>

        <!-- 部门成员列表 -->
        <div v-else-if="deptMembers.length > 0" class="space-y-2 max-h-80 overflow-y-auto">
          <div
            v-for="user in deptMembers"
            :key="user.id"
            class="flex items-center justify-between p-3 rounded-lg border transition-colors"
            :class="isMember(user.id) ? 'border-gray-100 bg-gray-50' : 'border-gray-200 hover:bg-blue-50 cursor-pointer'"
            @click="!isMember(user.id) && handleAddMember(user)"
          >
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <span class="text-sm font-medium text-blue-700">{{ (user.nickname || 'U')[0] }}</span>
              </div>
              <div>
                <p class="font-medium text-gray-800">{{ user.nickname }}</p>
                <p class="text-xs text-gray-500">{{ user.email }}</p>
              </div>
            </div>
            <span v-if="isMember(user.id)" class="text-xs text-green-600 font-medium px-2 py-1 bg-green-50 rounded">
              已加入
            </span>
            <span v-else class="text-xs text-blue-600 font-medium px-2 py-1 bg-blue-50 rounded">
              + 添加
            </span>
          </div>
        </div>

        <!-- 无部门成员 -->
        <div v-else class="text-center py-8 text-gray-500">
          <p class="text-sm">暂无可添加的部门成员</p>
        </div>

        <div class="flex justify-end mt-4 pt-4 border-t border-gray-100">
          <button
            @click="showAddMember = false"
            class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>

    <!-- 移交项目弹窗 -->
    <div v-if="showTransferProject" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h3 class="text-lg font-semibold mb-4">移交项目负责人</h3>
        <form @submit.prevent="handleTransferProject">
          <div class="space-y-4">
            <div class="p-3 bg-orange-50 rounded-lg text-sm text-orange-700">
              <p>移交后，您将成为普通成员，新负责人将获得项目的完整管理权限。</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">选择新负责人</label>
              <select v-model="transferForm.newOwnerId" class="input w-full" required>
                <option value="">请选择</option>
                <option
                  v-for="member in transferableMembers"
                  :key="member.id"
                  :value="member.user?.id"
                >
                  {{ member.user?.nickname }}
                </option>
              </select>
            </div>
            <div v-if="transferForm.newOwnerId" class="p-3 bg-gray-50 rounded-lg">
              <p class="text-sm text-gray-600">
                确认将项目移交给 <span class="font-medium">{{ getSelectedMemberName() }}</span> 吗？
              </p>
            </div>
          </div>
          <div class="flex justify-end gap-3 mt-6">
            <button
              type="button"
              @click="showTransferProject = false"
              class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              取消
            </button>
            <button
              type="submit"
              :disabled="!transferForm.newOwnerId || transferring"
              class="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
            >
              {{ transferring ? '移交中...' : '确认移交' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- 任务创建表单 -->
    <TaskForm
      v-if="showCreateTask"
      @close="showCreateTask = false"
      @saved="handleTaskSaved"
    />

    <!-- 删除任务确认弹窗 -->
    <div v-if="showDeleteTaskConfirm" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div class="text-center mb-4">
          <div class="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Trash2 class="w-6 h-6 text-red-600" />
          </div>
          <h3 class="text-lg font-semibold">确认删除任务？</h3>
          <p class="text-gray-500 text-sm mt-2">
            任务「{{ taskToDelete?.title }}」将被归档
          </p>
        </div>
        <div class="flex justify-end gap-3">
          <button
            @click="showDeleteTaskConfirm = false; taskToDelete = null"
            class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            取消
          </button>
          <button
            @click="handleDeleteTask"
            :disabled="deletingTask"
            class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {{ deletingTask ? '删除中...' : '确认删除' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 中集智历 - 项目详情页面
 */
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { User, Plus, Trash2, X } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { useProjectStore } from '@/stores/project'
import { getProjectMembers, updateProject, transferProject, addProjectMember, removeProjectMember } from '@/api/project'
import { getTasks, deleteTask } from '@/api/task'
import { getDepartmentMembers } from '@/api/user'
import { formatDate, formatDateTime } from '@/utils/date'
import { PROJECT_CATEGORY_MAP, PROJECT_CATEGORY_OPTIONS } from '@/types/project'
import type { ProjectCategory } from '@/types/project'
import TaskForm from '@/components/task/TaskForm.vue'
import type { Task, TaskStatus } from '@/types/task'
import type { ProjectMember } from '@/types/project'
import type { User as UserType } from '@/types/user'
import { useToast } from '@/composables/useToast'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const projectStore = useProjectStore()
const toast = useToast()

const members = ref<ProjectMember[]>([])
const tasks = ref<Task[]>([])
const showEditProject = ref(false)
const showAddMember = ref(false)
const showCreateTask = ref(false)
const showTransferProject = ref(false)
const saving = ref(false)
const transferring = ref(false)
const taskToDelete = ref<Task | null>(null)
const showDeleteTaskConfirm = ref(false)
const deletingTask = ref(false)
const loadingDeptMembers = ref(false)
const deptMembers = ref<UserType[]>([])

const editForm = reactive({
  name: '',
  description: '',
  visibility: 'PUBLIC' as 'PUBLIC' | 'PRIVATE',
  category: '' as ProjectCategory | ''
})

const transferForm = reactive({
  newOwnerId: ''
})

const projectId = computed(() => route.params.id as string)
const project = computed(() => projectStore.currentProject)
const categoryOptions = PROJECT_CATEGORY_OPTIONS

// 当前成员 ID 集合（用于判断是否已加入）
const memberIds = computed(() => new Set(members.value.map(m => m.userId)))

const isOwner = computed(() => {
  return project.value?.ownerId === authStore.user?.id
})

// 任务统计
const taskStats = computed(() => {
  const total = tasks.value.length
  const done = tasks.value.filter(t => t.status === 'DONE').length
  const inProgress = tasks.value.filter(t => t.status === 'IN_PROGRESS').length
  const todo = tasks.value.filter(t => t.status === 'TODO').length
  return { total, done, inProgress, todo }
})

// 可移交的成员列表（排除当前负责人）
const transferableMembers = computed(() => {
  return members.value.filter(m => m.userId !== authStore.user?.id)
})

function isMember(userId: string): boolean {
  return memberIds.value.has(userId)
}

function getStatusClass(status: TaskStatus): string {
  const classes: Record<TaskStatus, string> = {
    TODO: 'bg-gray-100 text-gray-700',
    IN_PROGRESS: 'bg-blue-100 text-blue-700',
    DONE: 'bg-green-100 text-green-700',
    CANCELLED: 'bg-red-100 text-red-700'
  }
  return classes[status]
}

function getStatusText(status: TaskStatus): string {
  const texts: Record<TaskStatus, string> = {
    TODO: '待办',
    IN_PROGRESS: '进行中',
    DONE: '已完成',
    CANCELLED: '已取消'
  }
  return texts[status]
}

function goToTask(id: string) {
  router.push(`/tasks/${id}`)
}

// ===== 编辑项目 =====

function openEditDialog() {
  if (project.value) {
    editForm.name = project.value.name
    editForm.description = project.value.description || ''
    editForm.visibility = project.value.visibility as 'PUBLIC' | 'PRIVATE'
    editForm.category = project.value.category || ''
  }
  showEditProject.value = true
}

async function handleEditProject() {
  saving.value = true
  try {
    await updateProject(projectId.value, {
      name: editForm.name,
      description: editForm.description,
      visibility: editForm.visibility,
      category: editForm.category || undefined
    })
    await projectStore.fetchProject(projectId.value)
    showEditProject.value = false
    toast.success('保存成功', '项目信息已更新')
  } catch {
    toast.error('保存失败', '项目更新失败')
  } finally {
    saving.value = false
  }
}

// ===== 添加成员（部门成员列表） =====

async function openAddMemberDialog() {
  showAddMember.value = true
  loadingDeptMembers.value = true
  try {
    const res = await getDepartmentMembers()
    deptMembers.value = res.members || []
  } catch {
    deptMembers.value = []
  } finally {
    loadingDeptMembers.value = false
  }
}

async function handleAddMember(user: UserType) {
  try {
    await addProjectMember(projectId.value, user.id)
    toast.success('添加成功', `${user.nickname} 已加入项目`)
    // 刷新成员列表
    members.value = await getProjectMembers(projectId.value)
  } catch (e: any) {
    toast.error('添加失败', e?.response?.data?.message || '请稍后重试')
  }
}

async function handleRemoveMember(member: ProjectMember) {
  if (!confirm(`确定要移除成员「${member.user?.nickname}」吗？`)) return
  try {
    await removeProjectMember(projectId.value, member.userId)
    toast.success('已移除', `${member.user?.nickname} 已移出项目`)
    members.value = await getProjectMembers(projectId.value)
  } catch {
    toast.error('移除失败', '请稍后重试')
  }
}

// ===== 移交项目 =====

function openTransferDialog() {
  transferForm.newOwnerId = ''
  showTransferProject.value = true
}

function getSelectedMemberName(): string {
  const member = transferableMembers.value.find(m => m.user?.id === transferForm.newOwnerId)
  return member?.user?.nickname || ''
}

async function handleTransferProject() {
  if (!transferForm.newOwnerId) return

  transferring.value = true
  try {
    await transferProject(projectId.value, transferForm.newOwnerId)
    showTransferProject.value = false
    toast.success('移交成功', '项目负责人已变更')
    await fetchData()
  } catch {
    toast.error('移交失败', '请稍后重试')
  } finally {
    transferring.value = false
  }
}

// ===== 任务操作 =====

function handleTaskSaved() {
  showCreateTask.value = false
  fetchData()
}

function confirmDeleteTask(task: Task) {
  taskToDelete.value = task
  showDeleteTaskConfirm.value = true
}

async function handleDeleteTask() {
  if (!taskToDelete.value) return

  deletingTask.value = true
  try {
    await deleteTask(taskToDelete.value.id)
    showDeleteTaskConfirm.value = false
    taskToDelete.value = null
    await fetchData()
  } catch {
    toast.error('删除失败', '请稍后重试')
  } finally {
    deletingTask.value = false
  }
}

// ===== 数据加载 =====

async function fetchData() {
  await projectStore.fetchProject(projectId.value)
  members.value = await getProjectMembers(projectId.value)
  const tasksResponse = await getTasks({ projectId: projectId.value })
  tasks.value = tasksResponse
}

onMounted(fetchData)
</script>
