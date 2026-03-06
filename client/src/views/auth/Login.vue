<template>
  <div class="min-h-screen bg-gray-100 flex items-center justify-center p-4">
    <div class="bg-white rounded-xl shadow-sm p-8 w-full max-w-md">
      <!-- Logo -->
      <div class="text-center mb-8">
        <div class="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
          <Calendar class="w-8 h-8 text-white" />
        </div>
        <h1 class="text-2xl font-bold text-gray-800">中集智历</h1>
        <p class="text-gray-500 mt-1">协同日历管理系统</p>
      </div>

      <!-- 登录表单 -->
      <form @submit.prevent="handleLogin" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
          <input
            v-model="form.email"
            type="email"
            class="input"
            placeholder="请输入邮箱"
            required
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">密码</label>
          <input
            v-model="form.password"
            type="password"
            class="input"
            placeholder="请输入密码"
            required
          />
        </div>

        <div v-if="error" class="text-red-500 text-sm">{{ error }}</div>

        <button
          type="submit"
          :disabled="loading"
          class="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {{ loading ? '登录中...' : '登录' }}
        </button>
      </form>

      <!-- 底部链接 -->
      <div class="mt-6 text-center text-sm text-gray-500">
        <p>
          还没有账号？
          <router-link to="/register" class="text-blue-600 hover:text-blue-700">
            立即注册
          </router-link>
        </p>
        <p class="mt-2">
          <router-link to="/forgot-password" class="text-blue-600 hover:text-blue-700">
            忘记密码？
          </router-link>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 中集智历 - 登录页面
 */
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { Calendar } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const loading = ref(false)
const error = ref('')

const form = reactive({
  email: '',
  password: ''
})

async function handleLogin() {
  loading.value = true
  error.value = ''

  try {
    await authStore.login(form.email, form.password)
    router.push('/')
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : '登录失败，请检查邮箱和密码'
    error.value = errorMessage
  } finally {
    loading.value = false
  }
}
</script>
