<template>
  <div class="space-y-4 md:space-y-6">
    <!-- 全局统计卡片 -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
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
    <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
      <div>
        <h1 class="text-xl md:text-2xl font-bold text-gray-900">用户管理</h1>
        <p class="text-sm text-gray-500 mt-0.5">管理系统中的所有用户</p>
      </div>
      <button
        @click="showAddModal = true"
        class="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 transition-colors shadow-sm text-sm font-medium"
      >
        <UserPlus class="w-4 h-4" />
        添加用户
      </button>
    </div>

    <!-- 搜索栏 -->
    <div class="bg-white rounded-xl border border-gray-200 p-3 md:p-4 shadow-sm">
      <div class="flex flex-col sm:flex-row gap-3">
        <div class="flex-1 relative">
          <Search class="w-4 h-4 sm:w-5 sm:h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            v-model="searchKeyword"
            type="text"
            placeholder="搜索用户姓名、邮箱..."
            class="w-full pl-9 sm:pl-10 pr-4 py-2 sm:py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 transition-colors text-sm"
          />
        </div>
        <select
          v-model="filterDepartment"
          class="px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 sm:min-w-[160px] transition-colors text-sm"
        >
          <option value="">全部部门</option>
          <option v-for="dept in departments" :key="dept.id" :value="dept.id">
            {{ dept.name }}
          </option>
        </select>
      </div>
    </div>

    <!-- 用户列表 -->
    <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <!-- 列表头部 -->
      <div class="px-4 md:px-6 py-3 border-b border-gray-100 bg-gray-50/50">
        <span class="text-sm text-gray-500">共 {{ filteredUsers.length }} 位用户</span>
      </div>

      <div v-if="loading" class="p-8 md:p-12 text-center">
        <div class="inline-flex items-center gap-2 text-gray-400">
          <Loader2 class="w-5 h-5 animate-spin" />
          <span>加载中...</span>
        </div>
      </div>

      <div v-else-if="filteredUsers.length === 0" class="p-8 md:p-12 text-center">
        <Users class="w-10 h-10 md:w-12 md:h-12 mx-auto text-gray-300 mb-3" />
        <p class="text-gray-400 text-sm">暂无用户</p>
      </div>

      <div v-else class="divide-y divide-gray-100">
        <div
          v-for="user in filteredUsers"
          :key="user.id"
          class="px-4 md:px-6 py-3 md:py-4 hover:bg-blue-50/30 transition-colors"
        >
          <!-- 桌面端：水平排列 -->
          <div class="hidden sm:flex items-center justify-between">
            <div class="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
              <div
                class="w-10 h-10 md:w-11 md:h-11 rounded-full flex items-center justify-center text-white font-medium text-sm shadow-sm flex-shrink-0"
                :class="avatarColor(user.email)"
              >
                {{ user.nickname?.charAt(0)?.toUpperCase() || user.email.charAt(0).toUpperCase() }}
              </div>
              <div class="min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <h3 class="font-medium text-gray-900 text-sm md:text-base">{{ user.nickname || '未设置昵称' }}</h3>
                  <span v-if="user.isAdmin" class="inline-flex items-center px-1.5 py-0.5 text-xs font-medium bg-red-50 text-red-600 rounded-full border border-red-100 whitespace-nowrap">
                    <Shield class="w-3 h-3 mr-0.5" />管理员
                  </span>
                  <span v-else-if="user.isDepartmentAdmin" class="inline-flex items-center px-1.5 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 whitespace-nowrap">
                    <Briefcase class="w-3 h-3 mr-0.5" />部门管理员
                  </span>
                  <span v-if="user.isBanned" class="inline-flex items-center px-1.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-500 rounded-full border border-gray-200 whitespace-nowrap">
                    <Ban class="w-3 h-3 mr-0.5" />已禁用
                  </span>
                </div>
                <div class="flex items-center gap-2 md:gap-3 mt-0.5 text-sm text-gray-400">
                  <span class="truncate">{{ user.email }}</span>
                  <span v-if="user.department" class="hidden md:flex items-center gap-1 text-xs flex-shrink-0">
                    <Building2 class="w-3 h-3" />
                    {{ user.department.name }}
                  </span>
                </div>
              </div>
            </div>
            <div class="flex items-center gap-1 flex-shrink-0 ml-3">
              <button
                v-if="!user.isAdmin"
                @click="handleToggleStatus(user)"
                class="p-2 rounded-lg transition-colors"
                :class="user.isBanned
                  ? 'text-emerald-600 hover:bg-emerald-50'
                  : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'"
                :title="user.isBanned ? '启用' : '禁用'"
              >
                <component :is="user.isBanned ? ToggleRight : ToggleLeft" class="w-4 h-4" />
              </button>
              <button
                v-if="!user.isAdmin"
                @click="handleDeleteUser(user)"
                class="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="删除用户"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </div>

          <!-- 手机端：卡片式布局 -->
          <div class="sm:hidden">
            <div class="flex items-start gap-3">
              <div
                class="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium text-sm shadow-sm flex-shrink-0"
                :class="avatarColor(user.email)"
              >
                {{ user.nickname?.charAt(0)?.toUpperCase() || user.email.charAt(0).toUpperCase() }}
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <h3 class="font-medium text-gray-900 text-sm">{{ user.nickname || '未设置昵称' }}</h3>
                  <span v-if="user.isAdmin" class="inline-flex items-center px-1.5 py-0.5 text-xs font-medium bg-red-50 text-red-600 rounded-full border border-red-100">
                    管理员
                  </span>
                  <span v-else-if="user.isDepartmentAdmin" class="inline-flex items-center px-1.5 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">
                    部门管理员
                  </span>
                  <span v-if="user.isBanned" class="inline-flex items-center px-1.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-500 rounded-full border border-gray-200">
                    已禁用
                  </span>
                </div>
                <p class="text-xs text-gray-400 mt-0.5 truncate">{{ user.email }}</p>
                <p v-if="user.department" class="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                  <Building2 class="w-3 h-3" />
                  {{ user.department.name }}
                </p>
              </div>
            </div>
            <!-- 手机端操作按钮行 -->
            <div v-if="!user.isAdmin" class="flex items-center gap-2 mt-2.5 pl-[52px]">
              <button
                @click="handleToggleStatus(user)"
                class="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-md transition-colors"
                :class="user.isBanned
                  ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'"
              >
                <component :is="user.isBanned ? ToggleRight : ToggleLeft" class="w-3.5 h-3.5" />
                {{ user.isBanned ? '启用' : '禁用' }}
              </button>
              <button
                @click="handleDeleteUser(user)"
                class="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-red-50 text-red-600 hover:bg-red-100 rounded-md transition-colors"
              >
                <Trash2 class="w-3.5 h-3.5" />
                删除
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 危险操作：转让系统管理员 -->
    <div class="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">
      <div class="px-4 md:px-6 py-4 border-b border-amber-100 bg-amber-50/50">
        <div class="flex items-center gap-2">
          <AlertTriangle class="w-4 h-4 text-amber-600" />
          <h3 class="font-medium text-amber-800">转让系统管理员</h3>
        </div>
        <p class="text-xs text-amber-600 mt-1">将管理员权限转让给其他用户后，您将成为普通用户并需要重新登录。</p>
      </div>
      <!-- 搜索 -->
      <div class="px-4 md:px-6 py-2.5 border-b border-gray-100">
        <div class="relative">
          <Search class="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            v-model="transferSearchKeyword"
            type="text"
            placeholder="搜索姓名、邮箱..."
            class="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-amber-400 focus:border-transparent bg-gray-50"
          />
        </div>
      </div>
      <!-- 按部门分组展示 -->
      <div v-if="transferGrouped.length > 0" class="max-h-72 overflow-y-auto">
        <div v-for="group in transferGrouped" :key="group.key" class="border-b border-gray-100 last:border-b-0">
          <button
            class="w-full px-4 md:px-6 py-2.5 flex items-center justify-between hover:bg-gray-50 transition-colors"
            @click="toggleTransferGroup(group.key)"
          >
            <div class="flex items-center gap-2">
              <component
                :is="transferExpandedDepts.has(group.key) ? ChevronDown : ChevronRight"
                class="w-4 h-4 text-gray-500 transition-transform duration-200"
              />
              <span class="text-sm font-medium text-gray-700">{{ group.label }}</span>
              <span class="text-xs text-gray-400">({{ group.users.length }})</span>
            </div>
          </button>
          <Transition
            enter-active-class="transition-all duration-200 ease-out"
            leave-active-class="transition-all duration-150 ease-in"
            enter-from-class="max-h-0 opacity-0"
            leave-to-class="max-h-0 opacity-0"
          >
            <div v-show="transferExpandedDepts.has(group.key)" class="pb-1">
            <div
              v-for="user in group.users"
              :key="user.id"
              class="px-4 md:px-6 py-2 flex items-center justify-between hover:bg-amber-50/30 transition-colors"
            >
              <div class="flex items-center gap-2.5">
                <div
                  class="w-7 h-7 rounded-full flex items-center justify-center text-white font-medium text-xs"
                  :class="avatarColor(user.email)"
                >
                  {{ user.nickname?.charAt(0)?.toUpperCase() || user.email.charAt(0).toUpperCase() }}
                </div>
                <div class="min-w-0">
                  <span class="text-sm text-gray-900">{{ user.nickname || '未设置昵称' }}</span>
                  <span class="text-xs text-gray-400 ml-1.5">{{ user.email }}</span>
                </div>
              </div>
              <button
                @click="handleTransferAdmin(user)"
                class="px-2.5 py-1 text-xs font-medium bg-amber-100 text-amber-700 hover:bg-amber-200 rounded-lg transition-colors whitespace-nowrap"
              >
                转让
              </button>
            </div>
          </div>
          </Transition>
        </div>
      </div>
      <div v-else class="px-4 md:px-6 py-4 text-center text-sm text-gray-400">
        暂无可转让的普通用户
      </div>
    </div>

    <!-- 添加用户弹窗 -->
    <div
      v-if="showAddModal"
      class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50"
      @click.self="closeAddModal"
    >
      <div class="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-5 md:p-6 shadow-xl sm:mx-4 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center gap-3 mb-5">
          <div class="w-9 h-9 md:w-10 md:h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <UserPlus class="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
          </div>
          <div>
            <h2 class="text-base md:text-lg font-semibold text-gray-900">添加用户</h2>
            <p class="text-xs md:text-sm text-gray-500">创建一个新的系统用户</p>
          </div>
        </div>
        <form @submit.prevent="handleCreateUser" class="space-y-3 md:space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">邮箱 *</label>
            <div class="relative">
              <Mail class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                v-model="addForm.email"
                type="email"
                required
                class="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 transition-colors text-sm"
                placeholder="请输入邮箱地址"
              />
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">昵称</label>
            <input
              v-model="addForm.nickname"
              type="text"
              class="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 transition-colors text-sm"
              placeholder="请输入用户昵称（可选）"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">密码 *</label>
            <div class="relative">
              <Lock class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                v-model="addForm.password"
                type="password"
                required
                minlength="6"
                class="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 transition-colors text-sm"
                placeholder="至少6位密码"
              />
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">所属部门</label>
            <select
              v-model="addForm.departmentId"
              class="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 transition-colors text-sm"
            >
              <option value="">不指定部门</option>
              <option v-for="dept in departments" :key="dept.id" :value="dept.id">
                {{ dept.name }}
              </option>
            </select>
          </div>
          <div class="flex justify-end gap-3 pt-1">
            <button
              type="button"
              @click="closeAddModal"
              class="px-4 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-sm"
            >
              取消
            </button>
            <button
              type="submit"
              :disabled="submitting"
              class="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm text-sm"
            >
              {{ submitting ? '创建中...' : '创建用户' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- 删除确认弹窗 -->
    <div
      v-if="deletingUser"
      class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50"
      @click.self="deletingUser = null"
    >
      <div class="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm p-5 md:p-6 shadow-xl sm:mx-4">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-9 h-9 md:w-10 md:h-10 bg-red-100 rounded-xl flex items-center justify-center">
            <AlertTriangle class="w-4 h-4 md:w-5 md:h-5 text-red-600" />
          </div>
          <h2 class="text-base md:text-lg font-semibold text-gray-900">删除用户</h2>
        </div>
        <p class="text-gray-600 text-sm mb-1">
          确定要删除用户「<span class="font-medium text-gray-900">{{ deletingUser.nickname || deletingUser.email }}</span>」吗？
        </p>
        <p class="text-xs text-gray-400 mb-5">此操作不可恢复，用户相关的任务将转移给管理员。</p>
        <div class="flex justify-end gap-3">
          <button
            @click="deletingUser = null"
            class="px-4 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-sm"
          >
            取消
          </button>
          <button
            @click="confirmDeleteUser"
            :disabled="deleting"
            class="px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors shadow-sm text-sm"
          >
            {{ deleting ? '删除中...' : '确认删除' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 转让管理员确认弹窗 -->
    <div
      v-if="transferringUser"
      class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50"
      @click.self="transferringUser = null"
    >
      <div class="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm p-5 md:p-6 shadow-xl sm:mx-4">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-9 h-9 md:w-10 md:h-10 bg-amber-100 rounded-xl flex items-center justify-center">
            <AlertTriangle class="w-4 h-4 md:w-5 md:h-5 text-amber-600" />
          </div>
          <h2 class="text-base md:text-lg font-semibold text-gray-900">转让管理员</h2>
        </div>
        <p class="text-gray-600 text-sm mb-1">
          将管理员权限转让给「<span class="font-medium text-gray-900">{{ transferringUser.nickname || transferringUser.email }}</span>」？
        </p>
        <p class="text-xs text-gray-400 mb-5">转让后您将成为普通用户，需要重新登录。</p>
        <div class="flex justify-end gap-3">
          <button
            @click="transferringUser = null"
            class="px-4 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-sm"
          >
            取消
          </button>
          <button
            @click="confirmTransferAdmin"
            :disabled="transferring"
            class="px-5 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors shadow-sm text-sm"
          >
            {{ transferring ? '转让中...' : '确认转让' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  Building2, Users, FolderKanban, CheckCircle, Search,
  UserPlus, Trash2, Mail, Lock, Loader2,
  Shield, Briefcase, Ban, AlertTriangle,
  ToggleLeft, ToggleRight, ChevronDown, ChevronRight
} from 'lucide-vue-next'
import type { User } from '@/types/user'
import type { Department } from '@/types/department'
import { getUsers, createUser, toggleUserStatus, deleteUser, transferAdmin } from '@/api/user'
import { getDepartments } from '@/api/department'
import StatisticsCard from '@/components/StatisticsCard.vue'
import { getAdminDashboard, type AdminDashboard } from '@/api/dashboard'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const toast = useToast()
const authStore = useAuthStore()

const loading = ref(true)
const submitting = ref(false)
const deleting = ref(false)
const transferring = ref(false)
const users = ref<User[]>([])
const departments = ref<Department[]>([])
const dashboard = ref<AdminDashboard | null>(null)
const searchKeyword = ref('')
const filterDepartment = ref('')

const showAddModal = ref(false)
const deletingUser = ref<User | null>(null)
const transferringUser = ref<User | null>(null)

const addForm = ref({
  email: '',
  password: '',
  nickname: '',
  departmentId: ''
})

const avatarColors = [
  'bg-gradient-to-br from-blue-400 to-blue-600',
  'bg-gradient-to-br from-emerald-400 to-emerald-600',
  'bg-gradient-to-br from-purple-400 to-purple-600',
  'bg-gradient-to-br from-amber-400 to-amber-600',
  'bg-gradient-to-br from-rose-400 to-rose-600',
  'bg-gradient-to-br from-cyan-400 to-cyan-600',
  'bg-gradient-to-br from-indigo-400 to-indigo-600',
  'bg-gradient-to-br from-teal-400 to-teal-600',
]

function avatarColor(email: string): string {
  let hash = 0
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash)
  }
  return avatarColors[Math.abs(hash) % avatarColors.length]
}

const filteredUsers = computed(() => {
  let result = users.value
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    result = result.filter(u =>
      u.nickname?.toLowerCase().includes(keyword) ||
      u.email.toLowerCase().includes(keyword)
    )
  }
  if (filterDepartment.value) {
    result = result.filter(u => u.departmentId === filterDepartment.value)
  }
  return result
})

// 可转让管理员的用户（非管理员、未禁用）
const transferSearchKeyword = ref('')
const transferExpandedDepts = ref<Set<string>>(new Set())

const transferableUsers = computed(() =>
  users.value.filter(u => !u.isAdmin && !u.isBanned)
)

const transferGrouped = computed(() => {
  const keyword = transferSearchKeyword.value.trim().toLowerCase()
  let list = transferableUsers.value
  if (keyword) {
    list = list.filter(u =>
      u.nickname?.toLowerCase().includes(keyword) || u.email.toLowerCase().includes(keyword)
    )
  }

  // 按部门分组
  const deptMap = new Map<string, { key: string; label: string; users: User[] }>()
  const noDeptKey = '__no_dept__'
  deptMap.set(noDeptKey, { key: noDeptKey, label: '未分配部门', users: [] })
  for (const dept of departments.value) {
    deptMap.set(dept.id, { key: dept.id, label: dept.name, users: [] })
  }

  for (const u of list) {
    const key = u.departmentId || noDeptKey
    const group = deptMap.get(key)
    if (group) group.users.push(u)
    else deptMap.set(key, { key, label: '未知部门', users: [u] })
  }

  // 排序：有部门的在前，按名称排序；未分配部门放最后
  return Array.from(deptMap.values())
    .filter(g => g.users.length > 0)
    .sort((a, b) => {
      if (a.key === noDeptKey) return 1
      if (b.key === noDeptKey) return -1
      return a.label.localeCompare(b.label)
    })
})

// 当分组数据变化时，初始化展开状态
watch(transferGrouped, (groups) => {
  if (groups.length > 0) {
    const newSet = new Set(groups.map(g => g.key))
    transferExpandedDepts.value = newSet
  }
}, { once: true })

function toggleTransferGroup(key: string) {
  const s = new Set(transferExpandedDepts.value)
  if (s.has(key)) s.delete(key)
  else s.add(key)
  transferExpandedDepts.value = s
}

function closeAddModal() {
  showAddModal.value = false
  addForm.value = { email: '', password: '', nickname: '', departmentId: '' }
}

async function handleCreateUser() {
  submitting.value = true
  try {
    await createUser(addForm.value)
    toast.success('创建成功', `用户「${addForm.value.nickname || addForm.value.email}」已创建`)
    closeAddModal()
    await loadData()
  } catch (e) {
    console.error('创建失败:', e)
    toast.error('创建失败', e instanceof Error ? e.message : '未知错误')
  } finally {
    submitting.value = false
  }
}

async function handleToggleStatus(user: User) {
  const action = user.isBanned ? '启用' : '禁用'
  if (!confirm(`确定要${action}用户「${user.nickname || user.email}」吗？`)) return
  try {
    await toggleUserStatus(user.id)
    toast.success('操作成功', `用户已${user.isBanned ? '启用' : '禁用'}`)
    await loadData()
  } catch (e) {
    console.error('操作失败:', e)
    toast.error('操作失败', e instanceof Error ? e.message : '未知错误')
  }
}

function handleTransferAdmin(user: User) {
  transferringUser.value = user
}

async function confirmTransferAdmin() {
  if (!transferringUser.value) return
  transferring.value = true
  try {
    const result = await transferAdmin(transferringUser.value.id)
    toast.success('转让成功', result.message)
    authStore.logout()
    router.push('/login')
  } catch (e) {
    console.error('转让失败:', e)
    toast.error('转让失败', e instanceof Error ? e.message : '未知错误')
  } finally {
    transferring.value = false
    transferringUser.value = null
  }
}

function handleDeleteUser(user: User) {
  deletingUser.value = user
}

async function confirmDeleteUser() {
  if (!deletingUser.value) return
  deleting.value = true
  try {
    const user = deletingUser.value
    await deleteUser(user.id)
    toast.success('删除成功', `用户「${user.nickname || user.email}」已删除`)
    await loadData()
  } catch (e) {
    console.error('删除失败:', e)
    toast.error('删除失败', e instanceof Error ? e.message : '未知错误')
  } finally {
    deleting.value = false
    deletingUser.value = null
  }
}

async function loadData() {
  loading.value = true
  try {
    const [usersData, deptsData, dashboardData] = await Promise.all([
      getUsers(),
      getDepartments(),
      getAdminDashboard().catch(() => null)
    ])
    users.value = usersData.filter((u: any) => u.email !== 'admin@example.com')
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
