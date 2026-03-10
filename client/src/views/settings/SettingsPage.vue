<template>
  <div>
    <h2 class="text-2xl font-bold text-gray-800 mb-6">设置</h2>

    <!-- 个人信息 -->
    <div class="bg-white rounded-lg border border-gray-200 p-6 mb-6">
      <h3 class="text-lg font-semibold mb-4">个人信息</h3>
      <form @submit.prevent="handleUpdateProfile">
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">昵称</label>
            <input v-model="profileForm.nickname" type="text" class="input max-w-md" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">个人简介</label>
            <textarea v-model="profileForm.bio" class="input max-w-md" rows="3"></textarea>
          </div>
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

    <!-- 部门信息 -->
    <div class="bg-white rounded-lg border border-gray-200 p-6 mb-6">
      <h3 class="text-lg font-semibold mb-4">部门信息</h3>
      <div v-if="userDepartment" class="flex items-center gap-4">
        <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
          <Building2 class="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <p class="font-medium text-gray-800">{{ userDepartment.name }}</p>
          <p class="text-sm text-gray-500">{{ userDepartment.description || '暂无描述' }}</p>
        </div>
      </div>
      <div v-else class="flex items-center gap-4 text-gray-500">
        <div class="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
          <Building2 class="w-6 h-6 text-gray-400" />
        </div>
        <div>
          <p class="font-medium">未加入部门</p>
          <p class="text-sm">您目前不属于任何部门</p>
        </div>
      </div>
    </div>

    <!-- 修改密码 -->
    <div class="bg-white rounded-lg border border-gray-200 p-6 mb-6">
      <h3 class="text-lg font-semibold mb-4">修改密码</h3>
      <form @submit.prevent="handleChangePassword">
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">当前密码</label>
            <input v-model="passwordForm.oldPassword" type="password" class="input max-w-md" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">新密码</label>
            <input v-model="passwordForm.newPassword" type="password" class="input max-w-md" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">确认新密码</label>
            <input v-model="passwordForm.confirmPassword" type="password" class="input max-w-md" />
          </div>
          <button
            type="submit"
            :disabled="changingPassword"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {{ changingPassword ? '修改中...' : '修改密码' }}
          </button>
        </div>
      </form>
    </div>

    <!-- 推送通知设置 -->
    <PushSettings />

    <!-- 已删除项目入口 -->
    <div class="bg-white rounded-lg border border-gray-200 p-6 mt-6">
      <h3 class="text-lg font-semibold mb-4">数据管理</h3>
      <div class="space-y-3">
        <router-link
          to="/tasks/archived"
          class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
        >
          <div>
            <p class="font-medium text-gray-800">归档任务</p>
            <p class="text-sm text-gray-500">查看和恢复已完成并归档的任务</p>
          </div>
          <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </router-link>
        <router-link
          to="/projects/deleted"
          class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
        >
          <div>
            <p class="font-medium text-gray-800">已删除的项目</p>
            <p class="text-sm text-gray-500">恢复30天内删除的项目</p>
          </div>
          <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 中集智历 - 设置页面
 */
import { computed, ref, reactive, onMounted } from 'vue'
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

const saving = ref(false)
const changingPassword = ref(false)

const profileForm = reactive({
  nickname: '',
  bio: ''
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
      bio: profileForm.bio
    })

    // 更新本地存储的用户信息
    authStore.setUser(updatedUser)

    toast('保存成功', 'success')
  } catch {
    toast('保存失败', 'error')
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
    // 重置表单
    passwordForm.oldPassword = ''
    passwordForm.newPassword = ''
    passwordForm.confirmPassword = ''
  } catch {
    toast('密码修改失败', 'error')
  } finally {
    changingPassword.value = false
  }
}

onMounted(async () => {
  if (authStore.user) {
    profileForm.nickname = authStore.user.nickname
    profileForm.bio = authStore.user.bio || ''
  }
  // 加载用户部门信息
  try {
    await departmentStore.fetchMyDepartment()
  } catch {
    // 用户可能没有部门，忽略错误
  }
})
</script>
