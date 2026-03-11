<template>
  <div class="space-y-6">
    <!-- 页面标题 -->
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">我的部门</h1>
        <p class="text-gray-500 mt-1">管理本部门成员和项目</p>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-12">
      <Loader2 class="w-8 h-8 animate-spin text-blue-600" />
    </div>

    <template v-else-if="department">
      <!-- 部门信息 -->
      <div class="bg-white rounded-lg border border-gray-200 p-6">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <Building2 class="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 class="text-xl font-bold text-gray-900">{{ department.name }}</h2>
            <p class="text-gray-500 text-sm">{{ department.description || '暂无描述' }}</p>
          </div>
        </div>
      </div>

      <!-- 任务统计卡片 -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatisticsCard
          :icon="CircleDot"
          :value="dashboard?.statistics.tasks.todo || 0"
          label="待办"
          color="blue"
        />
        <StatisticsCard
          :icon="Clock"
          :value="dashboard?.statistics.tasks.inProgress || 0"
          label="进行中"
          color="yellow"
        />
        <StatisticsCard
          :icon="CheckCircle"
          :value="dashboard?.statistics.tasks.done || 0"
          label="已完成"
          color="green"
        />
        <StatisticsCard
          :icon="AlertCircle"
          :value="dashboard?.statistics.tasks.overdue || 0"
          label="逾期"
          color="red"
        />
      </div>

      <!-- 基础统计卡片 -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="bg-white rounded-lg border border-gray-200 p-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Users class="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p class="text-2xl font-bold text-gray-900">{{ dashboard?.statistics.members.total || department.members?.length || 0 }}</p>
              <p class="text-sm text-gray-500">部门成员</p>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-lg border border-gray-200 p-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <FolderKanban class="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p class="text-2xl font-bold text-gray-900">{{ dashboard?.projects.length || department.projects?.length || 0 }}</p>
              <p class="text-sm text-gray-500">部门项目</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 成员工作负载 -->
      <div class="bg-white rounded-lg border border-gray-200">
        <div class="p-4 border-b border-gray-200 flex justify-between items-center">
          <h3 class="text-lg font-semibold text-gray-800">成员工作负载</h3>
          <button
            @click="showAddMemberModal = true"
            class="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center gap-1"
          >
            <Plus class="w-4 h-4" />
            添加成员
          </button>
        </div>
        <div class="divide-y divide-gray-200">
          <div
            v-for="member in dashboardMembers"
            :key="member.id"
            class="p-4 hover:bg-gray-50"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3 flex-1">
                <img
                  :src="member.avatar || `https://api.dicebear.com/7.x/avataa/svg?seed=${member.nickname}`"
                  :alt="member.nickname"
                  class="w-10 h-10 rounded-full"
                />
                <div class="flex-1">
                  <div class="flex items-center gap-2">
                    <p class="font-medium text-gray-900">{{ member.nickname }}</p>
                    <span
                      v-if="member.id === department.adminId"
                      class="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full"
                    >
                      管理员
                    </span>
                  </div>
                  <p class="text-sm text-gray-500">{{ member.email }}</p>
                </div>
              </div>
              <div class="flex items-center gap-4">
                <!-- 工作负载统计 -->
                <div class="flex items-center gap-3 text-sm">
                  <span class="text-blue-600" title="待办">{{ member.workload?.todo || 0 }} 待办</span>
                  <span class="text-yellow-600" title="进行中">{{ member.workload?.inProgress || 0 }} 进行中</span>
                  <span class="text-green-600" title="已完成">{{ member.workload?.done || 0 }} 已完成</span>
                </div>
                <!-- 工作负载进度条 -->
                <div class="w-24">
                  <ProgressBar
                    v-if="member.workload && member.workload.total > 0"
                    :progress="Math.round((member.workload.done / member.workload.total) * 100)"
                  />
                  <span v-else class="text-xs text-gray-400">无任务</span>
                </div>
                <router-link
                  :to="`/my-department/members/${member.id}/calendar`"
                  class="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                  title="查看日历"
                >
                  <Calendar class="w-4 h-4" />
                </router-link>
                <button
                  v-if="member.id !== department.adminId"
                  @click="handleRemoveMember(member.id)"
                  class="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                  title="移除成员"
                >
                  <UserMinus class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 项目进度 -->
      <div class="bg-white rounded-lg border border-gray-200">
        <div class="p-4 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-800">项目进度</h3>
        </div>
        <div class="divide-y divide-gray-200">
          <router-link
            v-for="project in dashboardProjects"
            :key="project.id"
            :to="`/projects/${project.id}`"
            class="p-4 flex items-center justify-between hover:bg-gray-50 block"
          >
            <div class="flex items-center gap-3 flex-1">
              <div class="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <FolderKanban class="w-5 h-5 text-purple-600" />
              </div>
              <div class="flex-1">
                <p class="font-medium text-gray-900">{{ project.name }}</p>
                <p class="text-sm text-gray-500">{{ project.taskCount }} 个任务</p>
              </div>
            </div>
            <div class="flex items-center gap-4">
              <div class="w-32">
                <ProgressBar :progress="project.progress" />
              </div>
              <span class="text-sm text-gray-500 w-12 text-right">{{ project.progress }}%</span>
              <ChevronRight class="w-5 h-5 text-gray-400" />
            </div>
          </router-link>
        </div>
      </div>

      <!-- 最近任务 -->
      <div v-if="dashboard?.recentTasks && dashboard.recentTasks.length > 0" class="bg-white rounded-lg border border-gray-200">
        <div class="p-4 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-800">最近任务</h3>
        </div>
        <div class="divide-y divide-gray-200">
          <div
            v-for="task in dashboard.recentTasks"
            :key="task.id"
            class="p-4 flex items-center justify-between hover:bg-gray-50"
          >
            <div class="flex items-center gap-3">
              <div
                :class="[
                  'w-2 h-2 rounded-full',
                  task.status === 'done' ? 'bg-green-500' :
                  task.status === 'in_progress' ? 'bg-yellow-500' :
                  task.status === 'cancelled' ? 'bg-gray-400' : 'bg-blue-500'
                ]"
              />
              <div>
                <p class="font-medium text-gray-900">{{ task.title }}</p>
                <p class="text-sm text-gray-500">
                  {{ task.assignee?.nickname || '未分配' }} · 截止 {{ formatDate(task.dueDate) }}
                </p>
              </div>
            </div>
            <router-link
              :to="`/projects/${task.project?.id}/tasks/${task.id}`"
              class="text-blue-600 hover:text-blue-700 text-sm"
            >
              查看详情
            </router-link>
          </div>
        </div>
      </div>
    </template>

    <div v-else class="text-center py-12">
      <p class="text-gray-500">您不是部门管理员</p>
      <router-link to="/dashboard" class="text-blue-600 hover:text-blue-700 mt-2 inline-block">
        返回首页
      </router-link>
    </div>

    <!-- 添加成员弹窗 -->
    <div
      v-if="showAddMemberModal"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      @click.self="showAddMemberModal = false"
    >
      <div class="bg-white rounded-xl p-6 w-full max-w-md">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">添加部门成员</h3>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">搜索用户</label>
            <div class="relative">
              <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                v-model="searchKeyword"
                type="text"
                class="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="输入邮箱或昵称搜索"
              />
            </div>
          </div>
          <div v-if="searchResults.length > 0" class="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
            <div
              v-for="user in searchResults"
              :key="user.id"
              class="p-3 flex items-center justify-between hover:bg-gray-50 cursor-pointer"
              @click="handleAddMember(user.id)"
            >
              <div class="flex items-center gap-3">
                <img
                  :src="user.avatar || `https://api.dicebear.com/7.x/avataa/svg?seed=${user.nickname}`"
                  :alt="user.nickname"
                  class="w-8 h-8 rounded-full"
                />
                <div>
                  <p class="text-sm font-medium text-gray-900">{{ user.nickname }}</p>
                  <p class="text-xs text-gray-500">{{ user.email }}</p>
                </div>
              </div>
              <Plus class="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>
        <div class="mt-4 flex justify-end gap-2">
          <button
            @click="showAddMemberModal = false"
            class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import {
  Building2,
  Users,
  FolderKanban,
  Plus,
  UserMinus,
  ChevronRight,
  Search,
  Loader2,
  Calendar,
  CircleDot,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-vue-next'
import { useDepartmentStore } from '@/stores/department'
import { useToast } from '@/composables/useToast'
import type { User } from '@/types/user'
import StatisticsCard from '@/components/StatisticsCard.vue'
import ProgressBar from '@/components/ProgressBar.vue'
import { searchUsersForDepartment } from '@/api/department'
import { getDepartmentDashboard, type DepartmentDashboard } from '@/api/dashboard'

const departmentStore = useDepartmentStore()
const toast = useToast()

const loading = ref(true)
const department = ref(departmentStore.myDepartment)
const dashboard = ref<DepartmentDashboard | null>(null)
const showAddMemberModal = ref(false)
const searchKeyword = ref('')
const searchResults = ref<User[]>([])

// 合并成员数据与工作负载
const dashboardMembers = computed(() => {
  if (!department.value) return []
  const members = department.value.members || []
  const dashboardMembersList = dashboard.value?.members || []

  return members.map(member => {
    const workloadData = dashboardMembersList.find(m => m.id === member.id)
    return {
      ...member,
      workload: workloadData?.workload || { total: 0, todo: 0, inProgress: 0, done: 0 }
    }
  })
})

// 合并项目数据与进度
const dashboardProjects = computed(() => {
  if (!department.value) return []
  const projects = department.value.projects || []
  const dashboardProjectsList = dashboard.value?.projects || []

  return projects.map(project => {
    const progressData = dashboardProjectsList.find(p => p.id === project.id)
    return {
      ...project,
      progress: progressData?.progress || 0,
      taskCount: progressData?.taskCount || 0
    }
  })
})

// 格式化日期
function formatDate(dateStr: string) {
  if (!dateStr) return '无截止日期'
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

// 搜索用户
watch(searchKeyword, async (keyword) => {
  if (!keyword || keyword.length < 2) {
    searchResults.value = []
    return
  }
  try {
    searchResults.value = await searchUsersForDepartment(keyword)
  } catch (e) {
    console.error('搜索用户失败:', e)
  }
})

// 添加成员
async function handleAddMember(userId: string) {
  if (!department.value) return
  try {
    await departmentStore.addMember(department.value.id, userId)
    toast.success('添加成功', '成员已添加到部门')
    showAddMemberModal.value = false
    searchKeyword.value = ''
    searchResults.value = []
    // 刷新仪表盘数据
    const result = await getDepartmentDashboard(department.value.id).catch(() => null)
    dashboard.value = result ?? null
  } catch (e) {
    toast.error('添加失败', e instanceof Error ? e.message : '未知错误')
  }
}

// 移除成员
async function handleRemoveMember(userId: string) {
  if (!department.value) return
  if (!confirm('确定要移除该成员吗？')) return
  try {
    await departmentStore.removeMember(department.value.id, userId)
    toast.success('移除成功', '成员已从部门移除')
    // 刷新仪表盘数据
    const result = await getDepartmentDashboard(department.value.id).catch(() => null)
    dashboard.value = result ?? null
  } catch (e) {
    toast.error('移除失败', e instanceof Error ? e.message : '未知错误')
  }
}

onMounted(async () => {
  try {
    await departmentStore.fetchMyDepartment()
    department.value = departmentStore.myDepartment

    // 获取部门仪表盘数据
    if (department.value?.id) {
      const result = await getDepartmentDashboard(department.value.id).catch(() => null)
      dashboard.value = result ?? null
    }
  } catch (e) {
    console.error('获取部门信息失败:', e)
  } finally {
    loading.value = false
  }
})
</script>
