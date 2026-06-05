<template>
  <div class="space-y-4 md:space-y-6 max-w-2xl">
    <h2 class="text-xl md:text-2xl font-bold text-gray-800">设置</h2>

    <!-- 个人信息 -->
    <div class="bg-white rounded-xl border border-gray-200 p-4 md:p-6 shadow-sm">
      <h3 class="text-base md:text-lg font-semibold mb-4 text-gray-900">个人信息</h3>
      <form @submit.prevent="handleUpdateProfile" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">昵称</label>
          <input
            v-model="profileForm.nickname"
            type="text"
            class="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 text-sm transition-colors"
            placeholder="输入昵称"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
          <div class="flex gap-2">
            <input
              v-model="profileForm.email"
              type="email"
              required
              class="flex-1 px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 text-sm transition-colors"
              placeholder="输入邮箱地址"
            />
          </div>
          <p class="text-xs text-gray-400 mt-1">修改邮箱后需使用新邮箱登录</p>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">个人简介</label>
          <textarea
            v-model="profileForm.bio"
            rows="3"
            class="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 text-sm transition-colors resize-none"
            placeholder="介绍一下自己（可选）"
          />
        </div>
        <button
          type="submit"
          :disabled="saving"
          class="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm font-medium shadow-sm"
        >
          {{ saving ? '保存中...' : '保存修改' }}
        </button>
      </form>
    </div>

    <!-- 部门信息 -->
    <div class="bg-white rounded-xl border border-gray-200 p-4 md:p-6 shadow-sm">
      <h3 class="text-base md:text-lg font-semibold mb-4 text-gray-900">部门信息</h3>
      <div v-if="userDepartment" class="flex items-center gap-3">
        <div class="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
          <Building2 class="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <p class="font-medium text-gray-800 text-sm">{{ userDepartment.name }}</p>
          <p class="text-xs text-gray-500">{{ userDepartment.description || '暂无描述' }}</p>
        </div>
      </div>
      <div v-else class="flex items-center gap-3 text-gray-500">
        <div class="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
          <Building2 class="w-5 h-5 text-gray-400" />
        </div>
        <div>
          <p class="font-medium text-sm">未加入部门</p>
          <p class="text-xs">您目前不属于任何部门</p>
        </div>
      </div>
    </div>

    <!-- 修改密码 -->
    <div class="bg-white rounded-xl border border-gray-200 p-4 md:p-6 shadow-sm">
      <h3 class="text-base md:text-lg font-semibold mb-4 text-gray-900">修改密码</h3>
      <form @submit.prevent="handleChangePassword" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">当前密码</label>
          <input
            v-model="passwordForm.oldPassword"
            type="password"
            class="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 text-sm transition-colors"
            placeholder="输入当前密码"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">新密码</label>
          <input
            v-model="passwordForm.newPassword"
            type="password"
            class="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 text-sm transition-colors"
            placeholder="至少6位新密码"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">确认新密码</label>
          <input
            v-model="passwordForm.confirmPassword"
            type="password"
            class="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 text-sm transition-colors"
            placeholder="再次输入新密码"
          />
        </div>
        <button
          type="submit"
          :disabled="changingPassword"
          class="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm font-medium shadow-sm"
        >
          {{ changingPassword ? '修改中...' : '修改密码' }}
        </button>
      </form>
    </div>

    <!-- 推送通知设置 -->
    <PushSettings />

    <!-- 数据管理 -->
    <div class="bg-white rounded-xl border border-gray-200 p-4 md:p-6 shadow-sm">
      <h3 class="text-base md:text-lg font-semibold mb-4 text-gray-900">数据管理</h3>
      <div class="space-y-2">
        <router-link
          to="/tasks/archived"
          class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <div>
            <p class="font-medium text-gray-800 text-sm">归档任务</p>
            <p class="text-xs text-gray-500">查看和恢复已完成并归档的任务</p>
          </div>
          <svg class="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </router-link>
        <router-link
          to="/projects/deleted"
          class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <div>
            <p class="font-medium text-gray-800 text-sm">已删除的项目</p>
            <p class="text-xs text-gray-500">恢复30天内删除的项目</p>
          </div>
          <svg class="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, onMounted } from 'vue'
import { Building2 } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { useDepartmentStore } from '@/stores/department'
import { updateUser } from '@/api/user'
import { useToast } from '@/composables/useToast'
import PushSettings from '@/components/settings/PushSettings.vue'

const { toast } = useToast()
const authStore = useAuthStore()
const departmentStore = useDepartmentStore()
const userDepartment = computed(() => departmentStore.myDepartment)

import { computed, ref } from 'vue'

const saving = ref(false)
const changingPassword = ref(false)

const profileForm = reactive({
  nickname: '',
  bio: '',
  email: ''
})

const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

async function handleUpdateProfile() {
  saving.value = true
  try {
    const userId = authStore.user?.id
    if (!userId) return

    const updatedUser = await updateUser(userId, {
      nickname: profileForm.nickname,
      bio: profileForm.bio,
      email: profileForm.email
    })

    authStore.setUser(updatedUser)
    toast('保存成功', 'success')
  } catch (e) {
    toast(e instanceof Error ? e.message : '保存失败', 'error')
  } finally {
    saving.value = false
  }
}

async function handleChangePassword() {
  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    toast('两次输入的密码不一致', 'error')
    return
  }

  if (passwordForm.newPassword.length < 6) {
    toast('密码长度至少6位', 'error')
    return
  }

  changingPassword.value = true
  try {
    await authStore.changePassword(passwordForm.oldPassword, passwordForm.newPassword)
    toast('密码修改成功', 'success')
    passwordForm.oldPassword = ''
    passwordForm.newPassword = ''
    passwordForm.confirmPassword = ''
  } catch (e) {
    toast(e instanceof Error ? e.message : '密码修改失败', 'error')
  } finally {
    changingPassword.value = false
  }
}

onMounted(async () => {
  if (authStore.user) {
    profileForm.nickname = authStore.user.nickname
    profileForm.bio = authStore.user.bio || ''
    profileForm.email = authStore.user.email
  }
  try {
    await departmentStore.fetchMyDepartment()
  } catch {
    // ignore
  }
})
</script>
