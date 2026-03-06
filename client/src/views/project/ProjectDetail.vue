<template>
  <div>
    <!-- 加载中 -->
    <div v-if="projectStore.loading" class="text-center py-12 text-gray-500">
      加载中...
    </div>

    <template v-else-if="project">
      <!-- 项目头部 -->
      <div class="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div class="flex items-start justify-between">
          <div>
            <h2 class="text-2xl font-bold text-gray-800">{{ project.name }}</h2>
            <p v-if="project.description" class="text-gray-500 mt-2">{{ project.description }}</p>
            <div class="flex items-center gap-4 mt-4">
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
          <div class="flex gap-2">
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
            <button
              @click="showInviteMember = true"
              class="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              邀请成员
            </button>
          </div>
        </div>
      </div>

      <!-- 成员列表 -->
      <div class="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h3 class="text-lg font-semibold mb-4">项目成员</h3>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div
            v-for="member in members"
            :key="member.id"
            class="flex items-center gap-3 p-3 rounded-lg border border-gray-200"
          >
            <div class="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
              <User class="w-5 h-5 text-gray-500" />
            </div>
            <div>
              <p class="font-medium text-gray-800">{{ member.user?.nickname }}</p>
              <p class="text-xs text-gray-500">{{ member.role === 'OWNER' ? '负责人' : '成员' }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 任务列表 -->
      <div class="bg-white rounded-lg border border-gray-200 p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold">任务列表</h3>
          <button
            @click="showCreateTask = true"
            class="flex items-center gap-2 px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus class="w-4 h-4" />
            新建任务
          </button>
        </div>

        <div v-if="tasks.length === 0" class="text-center py-8 text-gray-500">
          暂无任务
        </div>
        <div v-else class="space-y-3">
          <div
            v-for="task in tasks"
            :key="task.id"
            class="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
            @click="goToTask(task.id)"
          >
            <div class="flex items-center justify-between">
              <div>
                <h4 class="font-medium text-gray-800">{{ task.title }}</h4>
                <p class="text-sm text-gray-500 mt-1">
                  截止日期：{{ formatDateTime(task.dueDate) }}
                </p>
              </div>
              <span
                class="px-2 py-1 rounded text-xs"
                :class="getStatusClass(task.status)"
              >
                {{ getStatusText(task.status) }}
              </span>
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

    <!-- 邀请成员弹窗 -->
    <div v-if="showInviteMember" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h3 class="text-lg font-semibold mb-4">邀请成员</h3>
        <form @submit.prevent="handleInviteMember">
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">搜索用户</label>
              <input
                v-model="searchKeyword"
                type="text"
                class="input w-full"
                placeholder="输入邮箱或昵称搜索"
                @input="handleSearchUsers"
              />
            </div>
            <div v-if="searchResults.length > 0" class="border rounded-lg max-h-48 overflow-y-auto">
              <div
                v-for="user in searchResults"
                :key="user.id"
                @click="selectUser(user)"
                class="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer"
              >
                <div class="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <User class="w-4 h-4 text-gray-500" />
                </div>
                <div>
                  <p class="font-medium text-gray-800">{{ user.nickname }}</p>
                  <p class="text-xs text-gray-500">{{ user.email }}</p>
                </div>
              </div>
            </div>
            <div v-if="selectedUser" class="p-3 bg-blue-50 rounded-lg">
              <p class="text-sm">已选择: {{ selectedUser.nickname }} ({{ selectedUser.email }})</p>
            </div>
          </div>
          <div class="flex justify-end gap-3 mt-6">
            <button
              type="button"
              @click="showInviteMember = false; selectedUser = null"
              class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              取消
            </button>
            <button
              type="submit"
              :disabled="!selectedUser || inviting"
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {{ inviting ? '邀请中...' : '发送邀请' }}
            </button>
          </div>
        </form>
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
  </div>
</template>

<script setup lang="ts">
/**
 * 中集智历 - 项目详情页面
 */
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { User, Plus } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { useProjectStore } from '@/stores/project'
import { getProjectMembers, updateProject, inviteUser, transferProject } from '@/api/project'
import { getTasks } from '@/api/task'
import { searchUsers } from '@/api/user'
import { formatDate, formatDateTime } from '@/utils/date'
import type { Task, TaskStatus } from '@/types/task'
import type { ProjectMember } from '@/types/project'
import type { User as UserType } from '@/types/user'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const projectStore = useProjectStore()

const members = ref<ProjectMember[]>([])
const tasks = ref<Task[]>([])
const showEditProject = ref(false)
const showInviteMember = ref(false)
const showCreateTask = ref(false)
const showTransferProject = ref(false)
const saving = ref(false)
const inviting = ref(false)
const transferring = ref(false)
const searchKeyword = ref('')
const searchResults = ref<UserType[]>([])
const selectedUser = ref<UserType | null>(null)

const editForm = reactive({
  name: '',
  description: '',
  visibility: 'PUBLIC' as 'PUBLIC' | 'PRIVATE'
})

const transferForm = reactive({
  newOwnerId: ''
})

const projectId = computed(() => route.params.id as string)
const project = computed(() => projectStore.currentProject)

const isOwner = computed(() => {
  return project.value?.ownerId === authStore.user?.id
})

// 可移交的成员列表（排除当前负责人）
const transferableMembers = computed(() => {
  return members.value.filter(m => m.userId !== authStore.user?.id)
})

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

// 打开编辑弹窗时初始化表单
function openEditDialog() {
  if (project.value) {
    editForm.name = project.value.name
    editForm.description = project.value.description || ''
    editForm.visibility = project.value.visibility as 'PUBLIC' | 'PRIVATE'
  }
  showEditProject.value = true
}

// 编辑项目
async function handleEditProject() {
  saving.value = true
  try {
    await updateProject(projectId.value, {
      name: editForm.name,
      description: editForm.description,
      visibility: editForm.visibility
    })
    await projectStore.fetchProject(projectId.value)
    showEditProject.value = false
    alert('项目更新成功')
  } catch {
    alert('项目更新失败')
  } finally {
    saving.value = false
  }
}

// 搜索用户
async function handleSearchUsers() {
  if (!searchKeyword.value.trim()) {
    searchResults.value = []
    return
  }

  try {
    searchResults.value = await searchUsers(searchKeyword.value)
  } catch {
    searchResults.value = []
  }
}

// 选择用户
function selectUser(user: UserType) {
  selectedUser.value = user
  searchResults.value = []
  searchKeyword.value = ''
}

// 邀请成员
async function handleInviteMember() {
  if (!selectedUser.value) return

  inviting.value = true
  try {
    await inviteUser(projectId.value, selectedUser.value.id)
    showInviteMember.value = false
    selectedUser.value = null
    alert('邀请已发送')
  } catch {
    alert('邀请发送失败')
  } finally {
    inviting.value = false
  }
}

// 打开移交弹窗
function openTransferDialog() {
  transferForm.newOwnerId = ''
  showTransferProject.value = true
}

// 获取选中的成员名称
function getSelectedMemberName(): string {
  const member = transferableMembers.value.find(m => m.user?.id === transferForm.newOwnerId)
  return member?.user?.nickname || ''
}

// 移交项目
async function handleTransferProject() {
  if (!transferForm.newOwnerId) return

  transferring.value = true
  try {
    await transferProject(projectId.value, transferForm.newOwnerId)
    showTransferProject.value = false
    alert('项目移交成功')
    // 重新获取项目数据
    await fetchData()
  } catch {
    alert('项目移交失败')
  } finally {
    transferring.value = false
  }
}

async function fetchData() {
  await projectStore.fetchProject(projectId.value)
  // 获取成员列表
  members.value = await getProjectMembers(projectId.value)
  // 获取任务列表
  const tasksResponse = await getTasks({ projectId: projectId.value })
  tasks.value = tasksResponse
}

onMounted(fetchData)
</script>
