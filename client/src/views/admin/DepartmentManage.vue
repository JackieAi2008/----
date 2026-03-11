<template>
  <div class="space-y-6">
    <!-- 全局统计卡片 -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatisticsCard
        :icon="Building2"
        :value="dashboard?.overview.departments || 0"
        label="部门"
        color="blue"
        to="/admin/departments"
      />
      <StatisticsCard
        :icon="Users"
        :value="dashboard?.overview.users || 0"
        label="用户"
        color="green"
        to="/admin/users"
      />
      <StatisticsCard
        :icon="FolderKanban"
        :value="dashboard?.overview.projects || 0"
        label="项目"
        color="purple"
        to="/projects"
      />
      <StatisticsCard
        :icon="CheckCircle"
        :value="dashboard?.overview.tasks || 0"
        label="任务"
        color="yellow"
        to="/calendar"
      />
    </div>

    <!-- 页面标题 -->
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">部门管理</h1>
        <p class="text-gray-500 mt-1">管理系统中的所有部门</p>
      </div>
      <button
        @click="showCreateModal = true"
        class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
      >
        <Plus class="w-4 h-4" />
        创建部门
      </button>
    </div>

    <!-- 部门列表 -->
    <div class="bg-white rounded-lg border border-gray-200">
      <div v-if="loading" class="p-8 text-center text-gray-500">
        加载中...
      </div>
      <div v-else-if="departmentList.length === 0" class="p-8 text-center text-gray-500">
        暂无部门，点击上方按钮创建第一个部门
      </div>
      <div v-else class="divide-y divide-gray-200">
        <div
          v-for="dept in departmentList"
          :key="dept.id"
          class="p-4 hover:bg-gray-50"
        >
          <div class="flex items-center justify-between">
            <div class="flex-1">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Building2 class="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 class="font-medium text-gray-900">{{ dept.name }}</h3>
                  <p class="text-sm text-gray-500">{{ dept.description || '暂无描述' }}</p>
                </div>
              </div>
            </div>
            <div class="flex items-center gap-6 text-sm text-gray-500">
              <div class="flex items-center gap-1">
                <Users class="w-4 h-4" />
                <span>{{ dept.memberCount }} 人</span>
              </div>
              <div class="flex items-center gap-1">
                <FolderKanban class="w-4 h-4" />
                <span>{{ dept.projectCount }} 个项目</span>
              </div>
              <div class="w-32">
                <ProgressBar
                  v-if="dept.taskStats"
                  :progress="Math.round((dept.taskStats.done / Math.max(dept.taskStats.todo + dept.taskStats.inProgress + dept.taskStats.done, 1)) * 100)"
                />
              </div>
              <div class="flex items-center gap-2">
                <button
                  @click="openEditModal(dept)"
                  class="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                  title="编辑"
                >
                  <Pencil class="w-4 h-4" />
                </button>
                <button
                  @click="handleDelete(dept)"
                  class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                  title="删除"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 删除部门确认弹窗 -->
    <div
      v-if="deletingDepartment"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      @click.self="cancelDelete"
    >
      <div class="bg-white rounded-lg w-full max-w-md p-6">
        <h2 class="text-lg font-semibold mb-4">删除部门</h2>
        <p class="text-gray-600 mb-4">
          部门「{{ deletingDepartment.name }}」中还有
          <span class="font-medium text-gray-900">{{ deletingDepartment.memberCount }} 个成员</span> 和
          <span class="font-medium text-gray-900">{{ deletingDepartment.projectCount }} 个项目</span>。
        </p>
        <p class="text-gray-600 mb-4">请选择要迁移到的目标部门：</p>
        <select
          v-model="targetDepartmentId"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">请选择目标部门</option>
          <option
            v-for="dept in availableTargetDepartments"
            :key="dept.id"
            :value="dept.id"
          >
            {{ dept.name }}
          </option>
        </select>
        <div class="flex justify-end gap-3 mt-6">
          <button
            type="button"
            @click="cancelDelete"
            class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            取消
          </button>
          <button
            @click="confirmDelete"
            :disabled="!targetDepartmentId || deleting"
            class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {{ deleting ? '删除中...' : '确认删除' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 创建/编辑部门弹窗 -->
    <div
      v-if="showCreateModal || editingDepartment"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      @click.self="closeModal"
    >
      <div class="bg-white rounded-lg w-full max-w-md p-6">
        <h2 class="text-lg font-semibold mb-4">
          {{ editingDepartment ? '编辑部门' : '创建部门' }}
        </h2>
        <form @submit.prevent="handleSubmit">
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">部门名称 *</label>
              <input
                v-model="form.name"
                type="text"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="请输入部门名称"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">部门描述</label>
              <textarea
                v-model="form.description"
                rows="3"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="请输入部门描述（可选）"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">部门管理员 *</label>
              <select
                v-model="form.adminId"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">请选择部门管理员</option>
                <option v-for="user in availableUsers" :key="user.id" :value="user.id">
                  {{ user.nickname }} ({{ user.email }})
                </option>
              </select>
            </div>
          </div>
          <div class="flex justify-end gap-3 mt-6">
            <button
              type="button"
              @click="closeModal"
              class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              取消
            </button>
            <button
              type="submit"
              :disabled="submitting"
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {{ submitting ? '提交中...' : (editingDepartment ? '保存' : '创建') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { Plus, Building2, Users, FolderKanban, Pencil, Trash2, CheckCircle } from 'lucide-vue-next'
import { useDepartmentStore } from '@/stores/department'
import type { Department } from '@/types/department'
import type { User } from '@/types/user'
import { get } from '@/utils/request'
import StatisticsCard from '@/components/StatisticsCard.vue'
import ProgressBar from '@/components/ProgressBar.vue'
import { getAdminDashboard, type AdminDashboard } from '@/api/dashboard'

// 部门列表项类型（合并 department 和 dashboard 数据）
interface DepartmentListItem {
  id: string
  name: string
  description: string | null
  adminId: string
  memberCount: number
  projectCount: number
  taskStats: { todo: number; inProgress: number; done: number } | null
  isFullDepartment: boolean // 是否来自 store 的完整 department
}

const departmentStore = useDepartmentStore()

const loading = ref(true)
const submitting = ref(false)
const deleting = ref(false)
const showCreateModal = ref(false)
const editingDepartment = ref<Department | null>(null)
const deletingDepartment = ref<DepartmentListItem | null>(null)
const targetDepartmentId = ref('')
const availableUsers = ref<User[]>([])
const dashboard = ref<AdminDashboard | null>(null)

const form = ref({
  name: '',
  description: '',
  adminId: ''
})

const departments = computed(() => departmentStore.departments)

// 可选的目标部门列表（排除要删除的部门）
const availableTargetDepartments = computed(() => {
  if (!deletingDepartment.value) return []
  return departmentList.value.filter(d => d.id !== deletingDepartment.value?.id)
})

// 合并部门列表数据
const departmentList = computed<DepartmentListItem[]>(() => {
  const storeDepartments = departmentStore.departments
  const dashboardDepts = dashboard.value?.departments || []

  if (dashboardDepts.length > 0) {
    // 使用 dashboard 数据并合并 store 数据
    return dashboardDepts.map(dd => {
      const storeDept = storeDepartments.find(sd => sd.id === dd.id)
      return {
        id: dd.id,
        name: dd.name,
        description: storeDept?.description || null,
        adminId: storeDept?.adminId || '',
        memberCount: dd.memberCount,
        projectCount: dd.projectCount,
        taskStats: dd.taskStats,
        isFullDepartment: !!storeDept
      }
    })
  }

  // 回退到 store 数据
  return storeDepartments.map(sd => ({
    id: sd.id,
    name: sd.name,
    description: sd.description || null,
    adminId: sd.adminId,
    memberCount: sd.memberCount || sd.members?.length || 0,
    projectCount: sd.projectCount || sd.projects?.length || 0,
    taskStats: null,
    isFullDepartment: true
  }))
})

// 获取可用用户列表
async function fetchAvailableUsers() {
  try {
    const response = await get<User[]>('/users')
    availableUsers.value = response.data || []
  } catch (e) {
    console.error('获取用户列表失败:', e)
  }
}

// 打开编辑弹窗
function openEditModal(dept: DepartmentListItem) {
  const fullDept = departments.value.find(d => d.id === dept.id)
  if (!fullDept) return
  editingDepartment.value = fullDept
  form.value = {
    name: fullDept.name,
    description: fullDept.description || '',
    adminId: fullDept.adminId
  }
}

// 关闭弹窗
function closeModal() {
  showCreateModal.value = false
  editingDepartment.value = null
  form.value = { name: '', description: '', adminId: '' }
}

// 提交表单
async function handleSubmit() {
  submitting.value = true
  try {
    if (editingDepartment.value) {
      await departmentStore.updateDepartment(editingDepartment.value.id, form.value)
    } else {
      await departmentStore.createDepartment(form.value)
    }
    closeModal()
    await departmentStore.fetchDepartments()
    // 重新获取仪表盘数据
    const result = await getAdminDashboard().catch(() => null)
    dashboard.value = result ?? null
  } catch (e) {
    console.error('操作失败:', e)
  } finally {
    submitting.value = false
  }
}

// 删除部门
function handleDelete(dept: DepartmentListItem) {
  // 如果部门有成员或项目，显示目标部门选择弹窗
  if (dept.memberCount > 0 || dept.projectCount > 0) {
    deletingDepartment.value = dept
    targetDepartmentId.value = ''
  } else {
    // 直接删除空部门
    if (!confirm(`确定要删除部门「${dept.name}」吗？该操作不可撤销。`)) {
      return
    }
    deletingDepartment.value = dept
    confirmDelete()
  }
}

// 取消删除
function cancelDelete() {
  deletingDepartment.value = null
  targetDepartmentId.value = ''
}

// 确认删除
async function confirmDelete() {
  const dept = deletingDepartment.value
  if (!dept) return

  try {
    deleting.value = true
    await departmentStore.deleteDepartment(dept.id, targetDepartmentId.value || undefined)
    deletingDepartment.value = null
    targetDepartmentId.value = ''
    await departmentStore.fetchDepartments()
    // 重新获取仪表盘数据
    const result = await getAdminDashboard().catch(() => null)
    dashboard.value = result ?? null
  } catch (e) {
    console.error('删除失败:', e)
  } finally {
    deleting.value = false
  }
}

onMounted(async () => {
  loading.value = true
  try {
    await Promise.all([
      departmentStore.fetchDepartments(),
      fetchAvailableUsers()
    ])
    const result = await getAdminDashboard().catch(() => null)
    dashboard.value = result ?? null
  } finally {
    loading.value = false
  }
})
</script>
