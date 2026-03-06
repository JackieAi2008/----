<template>
  <div class="min-h-screen bg-gray-100 flex items-center justify-center p-4">
    <div class="bg-white rounded-xl shadow-sm p-8 w-full max-w-md">
      <!-- Logo -->
      <div class="text-center mb-8">
        <div class="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
          <Calendar class="w-8 h-8 text-white" />
        </div>
        <h1 class="text-2xl font-bold text-gray-800">注册账号</h1>
        <p class="text-gray-500 mt-1">创建您的中集智历账号</p>
      </div>

      <!-- 注册表单 -->
      <form @submit.prevent="handleRegister" class="space-y-4">
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
          <label class="block text-sm font-medium text-gray-700 mb-1">昵称</label>
          <input
            v-model="form.nickname"
            type="text"
            class="input"
            placeholder="请输入昵称"
            required
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">密码</label>
          <input
            v-model="form.password"
            type="password"
            class="input"
            placeholder="请输入密码（至少6位）"
            minlength="6"
            required
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">确认密码</label>
          <input
            v-model="form.confirmPassword"
            type="password"
            class="input"
            placeholder="请再次输入密码"
            required
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">安全问题</label>
          <select v-model="form.securityQuestion" class="input" required>
            <option value="">请选择安全问题</option>
            <option v-for="q in securityQuestions" :key="q.index" :value="q.index">
              {{ q.question }}
            </option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">安全问题答案</label>
          <input
            v-model="form.securityAnswer"
            type="text"
            class="input"
            placeholder="请输入答案"
            required
          />
        </div>

        <div v-if="error" class="text-red-500 text-sm">{{ error }}</div>

        <button
          type="submit"
          :disabled="loading"
          class="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {{ loading ? '注册中...' : '注册' }}
        </button>
      </form>

      <!-- 底部链接 -->
      <div class="mt-6 text-center text-sm text-gray-500">
        <p>
          已有账号？
          <router-link to="/login" class="text-blue-600 hover:text-blue-700">
            立即登录
          </router-link>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 中集智历 - 注册页面
 */
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { Calendar } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { SECURITY_QUESTIONS } from '@/types/user'

const router = useRouter()
const authStore = useAuthStore()

const loading = ref(false)
const error = ref('')
const securityQuestions = SECURITY_QUESTIONS

const form = reactive({
  email: '',
  nickname: '',
  password: '',
  confirmPassword: '',
  securityQuestion: '',
  securityAnswer: ''
})

async function handleRegister() {
  // 验证密码
  if (form.password !== form.confirmPassword) {
    error.value = '两次输入的密码不一致'
    return
  }

  if (form.password.length < 6) {
    error.value = '密码长度至少6位'
    return
  }

  if (!form.securityQuestion) {
    error.value = '请选择安全问题'
    return
  }

  loading.value = true
  error.value = ''

  try {
    await authStore.register({
      email: form.email,
      password: form.password,
      nickname: form.nickname,
      securityQuestion: parseInt(form.securityQuestion),
      securityAnswer: form.securityAnswer
    })
    router.push('/')
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : '注册失败，请稍后重试'
    error.value = errorMessage
  } finally {
    loading.value = false
  }
}
</script>
