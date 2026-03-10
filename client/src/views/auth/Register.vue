<template>
  <div class="min-h-screen flex">
    <!-- 左侧品牌区域 -->
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

    <!-- 右侧注册表单 -->
    <div class="flex-1 flex items-center justify-center p-4 sm:p-8 bg-gray-50 overflow-y-auto">
      <div class="w-full max-w-md my-4 sm:my-0">
        <!-- 移动端Logo -->
        <div class="lg:hidden text-center mb-6">
          <div class="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg">
            <Calendar class="w-8 h-8 text-white" />
          </div>
          <h1 class="text-xl sm:text-2xl font-bold text-gray-800">中集智历</h1>
          <p class="text-gray-500 text-sm mt-1">协同日历管理系统</p>
        </div>

        <!-- 注册卡片 -->
        <div class="bg-white rounded-2xl shadow-xl p-5 sm:p-8">
          <div class="text-center mb-5 sm:mb-8">
            <h2 class="text-xl sm:text-2xl font-bold text-gray-800">创建账号</h2>
            <p class="text-gray-500 mt-1 sm:mt-2 text-sm sm:text-base">填写以下信息完成注册</p>
          </div>

          <form @submit.prevent="handleRegister" class="space-y-4 sm:space-y-5">
            <!-- 邮箱输入 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">邮箱</label>
              <div class="relative">
                <Mail class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  v-model="form.email"
                  type="email"
                  class="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="请输入邮箱地址"
                  required
                />
              </div>
            </div>

            <!-- 昵称输入 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">昵称</label>
              <div class="relative">
                <User class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  v-model="form.nickname"
                  type="text"
                  class="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="请输入昵称"
                  required
                />
              </div>
            </div>

            <!-- 密码输入 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">密码</label>
              <div class="relative">
                <Lock class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  v-model="form.password"
                  :type="showPassword ? 'text' : 'password'"
                  class="w-full pl-11 pr-11 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="请输入密码（至少6位）"
                  required
                />
                <button
                  type="button"
                  @click="showPassword = !showPassword"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <Eye v-if="!showPassword" class="w-5 h-5" />
                  <EyeOff v-else class="w-5 h-5" />
                </button>
              </div>
            </div>

            <!-- 确认密码输入 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">确认密码</label>
              <div class="relative">
                <ShieldCheck class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  v-model="form.confirmPassword"
                  :type="showConfirmPassword ? 'text' : 'password'"
                  class="w-full pl-11 pr-11 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="请再次输入密码"
                  required
                />
                <button
                  type="button"
                  @click="showConfirmPassword = !showConfirmPassword"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <Eye v-if="!showConfirmPassword" class="w-5 h-5" />
                  <EyeOff v-else class="w-5 h-5" />
                </button>
              </div>
            </div>

            <!-- 部门选择 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                所属部门
                <span class="text-gray-400 font-normal">（可选）</span>
              </label>
              <div class="relative">
                <Building2 class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select
                  v-model="form.departmentId"
                  :disabled="loadingDepartments"
                  class="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 appearance-none bg-white"
                >
                  <option value="">不选择部门</option>
                  <option
                    v-for="dept in departmentOptions"
                    :key="dept.id"
                    :value="dept.id"
                  >
                    {{ dept.name }}
                  </option>
                </select>
              </div>
              <p class="mt-1 text-xs text-gray-400">
                选择部门后，需要部门管理员审核才能加入
              </p>
            </div>

            <!-- 安全问题 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">安全问题</label>
              <div class="relative">
                <ShieldCheck class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select
                  v-model="form.securityQuestion"
                  class="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 appearance-none bg-white"
                >
                  <option
                    v-for="q in SECURITY_QUESTIONS"
                    :key="q.index"
                    :value="q.index"
                  >
                    {{ q.question }}
                  </option>
                </select>
              </div>
            </div>

            <!-- 安全问题答案 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">安全问题答案</label>
              <div class="relative">
                <Lock class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  v-model="form.securityAnswer"
                  type="text"
                  class="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="请输入安全问题答案"
                  required
                />
              </div>
            </div>

            <!-- 错误提示 -->
            <div v-if="error" class="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center gap-2">
              <AlertCircle class="w-4 h-4" />
              {{ error }}
            </div>

            <!-- 注册按钮 -->
            <button
              type="submit"
              :disabled="loading"
              class="w-full bg-blue-600 text-white py-3 px-4 rounded-xl font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
            >
              <Loader2 v-if="loading" class="w-5 h-5 animate-spin" />
              {{ loading ? '注册中...' : '立即注册' }}
            </button>
          </form>

          <!-- 底部链接 -->
          <div class="mt-6 pt-6 border-t border-gray-100 text-center text-sm text-gray-500">
            <p>
              已有账号？
              <router-link to="/login" class="text-blue-600 hover:text-blue-700 font-medium">
                立即登录
              </router-link>
            </p>
          </div>
        </div>

        <!-- 版权信息 -->
        <p class="text-center text-gray-400 text-sm mt-8">
          © 2026 中集智历 All rights reserved.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 中集智历 - 注册页面
 * 保持与登录页面风格一致
 */
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  Calendar,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  CheckCircle,
  User,
  ShieldCheck,
  Building2
} from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import { SECURITY_QUESTIONS } from '@/types/user'
import { getDepartmentOptions } from '@/api/department'
import type { DepartmentOption } from '@/types/department'

const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()

const loading = ref(false)
const error = ref('')
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const departmentOptions = ref<DepartmentOption[]>([])
const loadingDepartments = ref(false)

const form = reactive({
  email: '',
  nickname: '',
  password: '',
  confirmPassword: '',
  securityQuestion: 0,
  securityAnswer: '',
  departmentId: ''
})

// 加载部门选项
onMounted(async () => {
  loadingDepartments.value = true
  try {
    departmentOptions.value = await getDepartmentOptions()
  } catch (e) {
    console.error('加载部门列表失败:', e)
  } finally {
    loadingDepartments.value = false
  }
})

async function handleRegister() {
  error.value = ''

  // 表单验证
  if (!form.email) {
    error.value = '请输入邮箱地址'
    return
  }

  if (!form.nickname) {
    error.value = '请输入昵称'
    return
  }

  if (form.password.length < 6) {
    error.value = '密码长度至少6位'
    return
  }

  if (form.password !== form.confirmPassword) {
    error.value = '两次输入的密码不一致'
    return
  }

  if (!form.securityAnswer.trim()) {
    error.value = '请输入安全问题答案'
    return
  }

  loading.value = true

  try {
    await authStore.register({
      email: form.email,
      password: form.password,
      nickname: form.nickname,
      securityQuestion: form.securityQuestion,
      securityAnswer: form.securityAnswer.trim(),
      departmentId: form.departmentId || undefined
    })
    toast.success('注册成功', '请使用新账号登录')
    router.push('/login')
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : '注册失败，请稍后重试'
    error.value = errorMessage
  } finally {
    loading.value = false
  }
}
</script>
