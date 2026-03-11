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
        <h1 class="text-2xl font-bold text-gray-900">用户管理</h1>
        <p class="text-gray-500 mt-1">管理系统中的所有用户</p>
      </div>
    </div>

    <!-- 搜索栏 -->
    <div class="flex gap-4">
      <div class="flex-1 relative">
        <Search class="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          v-model="searchKeyword"
          type="text"
          placeholder="搜索用户姓名、邮箱..."
          class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
      <select
        v-model="filterDepartment"
        class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <option value="">全部部门</option>
        <option v-for="dept in departments" :key="dept.id" :value="dept.id">
          {{ dept.name }}
        </option>
      </select>
    </div>

    <!-- 用户列表 -->
    <div class="bg-white rounded-lg border border-gray-200">
      <div v-if="loading" class="p-8 text-center text-gray-500">
        加载中...
      </div>
      <div v-else-if="filteredUsers.length === 0" class="p-8 text-center text-gray-500">
        暂无用户
      </div>
      <div v-else class="divide-y divide-gray-200">
        <div
          v-for="user in filteredUsers"
          :key="user.id"
          class="p-4 hover:bg-gray-50"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-4">
              <!-- 头像 -->
              <div class="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-medium">
                {{ user.nickname?.charAt(0) || user.email.charAt(0) }}
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <h3 class="font-medium text-gray-900">{{ user.nickname || '未设置昵称' }}</h3>
                  <span v-if="user.isAdmin" class="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">管理员</span>
                  <span v-else-if="user.isDepartmentAdmin" class="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">部门管理员</span>
                  <span v-if="user.isBanned" class="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">已禁用</span>
                </div>
                <p class="text-sm text-gray-500">{{ user.email }}</p>
                <p v-if="user.department" class="text-xs text-gray-400 mt-0.5">
                  {{ user.department.name }}
                </p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button
                v-if="!user.isAdmin"
                @click="toggleUserStatus(user)"
                class="px-3 py-1.5 text-sm rounded-lg transition-colors"
                :class="user.isBanned ? 'bg-green-50 text-green-600 hover:bg-green-100' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'"
              >
                {{ user.isBanned ? '启用' : '禁用' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { Building2, Users, FolderKanban, CheckCircle, Search } from 'lucide-vue-next'
import type { User } from '@/types/user'
import type { Department } from '@/types/department'
import { getUsers } from '@/api/user'
import { getDepartments } from '@/api/department'
import StatisticsCard from '@/components/StatisticsCard.vue'
import { getAdminDashboard, type AdminDashboard } from '@/api/dashboard'

const loading = ref(true)
const users = ref<User[]>([])
const departments = ref<Department[]>([])
const dashboard = ref<AdminDashboard | null>(null)
const searchKeyword = ref('')
const filterDepartment = ref('')

// 过滤用户
const filteredUsers = computed(() => {
  let result = users.value
  
  // 按关键词搜索
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    result = result.filter(u => 
      u.nickname?.toLowerCase().includes(keyword) ||
      u.email.toLowerCase().includes(keyword)
    )
  }
  
  // 按部门筛选
  if (filterDepartment.value) {
    result = result.filter(u => u.departmentId === filterDepartment.value)
  }
  
  return result
})

// 切换用户状态（启用/禁用）
async function toggleUserStatus(user: User) {
  const action = user.isBanned ? '启用' : '禁用'
  if (!confirm(`确定要${action}用户「${user.nickname || user.email}」吗？`)) {
    return
  }
  
  try {
    // TODO: 调用API切换用户状态
    // await toggleUserBanStatus(user.id, !user.isBanned)
    // 重新加载用户列表
    // await loadUsers()
    alert('功能开发中...')
  } catch (e) {
    console.error('操作失败:', e)
  }
}

// 加载数据
async function loadData() {
  loading.value = true
  try {
    const [usersData, deptsData, dashboardData] = await Promise.all([
      getUsers(),
      getDepartments(),
      getAdminDashboard().catch(() => null)
    ])
    users.value = usersData
    departments.value = deptsData
    dashboard.value = dashboardData ?? null
  } catch (e) {
    console.error('加载数据失败:', e)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>
