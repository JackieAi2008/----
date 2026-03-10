<template>
  <div class="min-h-screen flex flex-col lg:flex-row">
    <!-- 左侧品牌区域 - 桌面端显示 -->
    <div class="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 relative overflow-hidden">
      <!-- 装饰背景 -->
      <div class="absolute inset-0">
        <div class="absolute top-20 left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl"></div>
        <div class="absolute bottom-20 right-20 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl"></div>
      </div>

      <!-- 品牌内容 -->
      <div class="relative z-10 flex flex-col justify-center px-16 text-white">
        <div class="flex items-center gap-4 mb-8">
          <div class="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
            <Calendar class="w-9 h-9" />
          </div>
          <div>
            <h1 class="text-3xl font-bold">中集智历</h1>
            <p class="text-blue-200">协同日历管理系统</p>
          </div>
        </div>

        <p class="text-xl text-blue-100 mb-8 max-w-md">
          高效团队协作，从智能日历开始。让每一个任务都有迹可循。
        </p>

        <div class="space-y-4 text-blue-100">
          <div class="flex items-center gap-3">
            <CheckCircle class="w-5 h-5 text-green-400" />
            <span>多视图日历，一目了然</span>
          </div>
          <div class="flex items-center gap-3">
            <CheckCircle class="w-5 h-5 text-green-400" />
            <span>项目任务协同管理</span>
          </div>
          <div class="flex items-center gap-3">
            <CheckCircle class="w-5 h-5 text-green-400" />
            <span>智能提醒，不错过重要事项</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 右侧登录表单 -->
    <div class="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8 bg-gray-50 min-h-screen lg:min-h-0">
      <div class="w-full max-w-md">
        <!-- 移动端Logo -->
        <div class="lg:hidden text-center mb-6 sm:mb-8">
          <div class="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-lg">
            <Calendar class="w-7 h-7 sm:w-8 sm:h-8 text-white" />
          </div>
          <h1 class="text-xl sm:text-2xl font-bold text-gray-800">中集智历</h1>
          <p class="text-sm text-gray-500 mt-1 hidden sm:block">协同日历管理系统</p>
        </div>

        <!-- 登录卡片 -->
        <div class="bg-white rounded-2xl shadow-xl p-5 sm:p-6 md:p-8">
          <div class="text-center mb-6 sm:mb-8">
            <h2 class="text-xl sm:text-2xl font-bold text-gray-800">欢迎回来</h2>
            <p class="text-gray-500 mt-2 text-sm sm:text-base">请登录您的账号</p>
          </div>

          <form @submit.prevent="handleLogin" class="space-y-4 sm:space-y-5">
            <!-- 邮箱输入 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">邮箱</label>
              <div class="relative">
                <Mail class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  v-model="form.email"
                  type="email"
                  class="w-full pl-11 pr-4 py-2.5 sm:py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-base"
                  placeholder="请输入邮箱地址"
                  required
                  autocomplete="email"
                />
              </div>
            </div>

            <!-- 密码输入 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">密码</label>
              <div class="relative">
                <Lock class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  v-model="form.password"
                  :type="showPassword ? 'text' : 'password'"
                  class="w-full pl-11 pr-11 py-2.5 sm:py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-base"
                  placeholder="请输入密码"
                  required
                  autocomplete="current-password"
                />
                <button
                  type="button"
                  @click="showPassword = !showPassword"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                >
                  <Eye v-if="!showPassword" class="w-5 h-5" />
                  <EyeOff v-else class="w-5 h-5" />
                </button>
              </div>
            </div>

            <!-- 错误提示 -->
            <div v-if="error" class="bg-red-50 text-red-600 text-sm p-3 rounded-xl flex items-center gap-2">
              <AlertCircle class="w-4 h-4 flex-shrink-0" />
              <span>{{ error }}</span>
            </div>

            <!-- 登录按钮 -->
            <button
              type="submit"
              :disabled="loading"
              class="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 shadow-button text-base"
            >
              <Loader2 v-if="loading" class="w-5 h-5 animate-spin" />
              {{ loading ? '登录中...' : '登录' }}
            </button>
          </form>

          <!-- 底部链接 -->
          <div class="mt-5 sm:mt-6 pt-5 sm:pt-6 border-t border-gray-100 text-center text-sm text-gray-500">
            <p>
              还没有账号？
              <router-link to="/register" class="text-blue-600 hover:text-blue-700 font-medium">
                立即注册
              </router-link>
            </p>
            <p class="mt-2">
              <router-link to="/forgot-password" class="text-gray-500 hover:text-gray-700">
                忘记密码？
              </router-link>
            </p>
          </div>
        </div>

        <!-- 版权信息 -->
        <p class="text-center text-gray-400 text-xs sm:text-sm mt-6 sm:mt-8">
          © 2026 中集智历 All rights reserved.
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
import {
  Calendar,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  CheckCircle
} from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const loading = ref(false)
const error = ref('')
const showPassword = ref(false)

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
