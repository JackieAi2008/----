<template>
  <div class="min-h-screen bg-gray-100 flex items-center justify-center p-4">
    <div class="bg-white rounded-xl shadow-sm p-8 w-full max-w-md">
      <!-- Logo -->
      <div class="text-center mb-8">
        <div class="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
          <KeyRound class="w-8 h-8 text-white" />
        </div>
        <h1 class="text-2xl font-bold text-gray-800">找回密码</h1>
        <p class="text-gray-500 mt-1">通过安全问题重置密码</p>
      </div>

      <!-- 步骤1：输入邮箱 -->
      <form v-if="step === 1" @submit.prevent="handleCheckEmail" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
          <input
            v-model="form.email"
            type="email"
            class="input"
            placeholder="请输入注册时使用的邮箱"
            required
          />
        </div>

        <div v-if="error" class="text-red-500 text-sm">{{ error }}</div>

        <button
          type="submit"
          :disabled="loading"
          class="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {{ loading ? '验证中...' : '下一步' }}
        </button>
      </form>

      <!-- 步骤2：验证安全问题 -->
      <form v-else-if="step === 2" @submit.prevent="handleVerifyAnswer" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">安全问题</label>
          <p class="text-gray-800 p-3 bg-gray-50 rounded-lg">{{ currentQuestion }}</p>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">答案</label>
          <input
            v-model="form.answer"
            type="text"
            class="input"
            placeholder="请输入安全问题答案"
            required
          />
        </div>

        <div v-if="error" class="text-red-500 text-sm">{{ error }}</div>

        <button
          type="submit"
          :disabled="loading"
          class="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {{ loading ? '验证中...' : '验证' }}
        </button>
      </form>

      <!-- 步骤3：设置新密码 -->
      <form v-else @submit.prevent="handleResetPassword" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">新密码</label>
          <input
            v-model="form.newPassword"
            type="password"
            class="input"
            placeholder="请输入新密码（至少6位）"
            minlength="6"
            required
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">确认新密码</label>
          <input
            v-model="form.confirmPassword"
            type="password"
            class="input"
            placeholder="请再次输入新密码"
            required
          />
        </div>

        <div v-if="error" class="text-red-500 text-sm">{{ error }}</div>

        <button
          type="submit"
          :disabled="loading"
          class="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {{ loading ? '重置中...' : '重置密码' }}
        </button>
      </form>

      <!-- 底部链接 -->
      <div class="mt-6 text-center text-sm text-gray-500">
        <p>
          想起密码了？
          <router-link to="/login" class="text-blue-600 hover:text-blue-700">
            返回登录
          </router-link>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 中集智历 - 找回密码页面
 */
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { KeyRound } from 'lucide-vue-next'
import { verifySecurityQuestion, resetPassword, getSecurityQuestion } from '@/api/auth'
import { SECURITY_QUESTIONS } from '@/types/user'

const router = useRouter()

const loading = ref(false)
const error = ref('')
const step = ref(1)
const questionIndex = ref(0)

const form = reactive({
  email: '',
  answer: '',
  newPassword: '',
  confirmPassword: ''
})

const currentQuestion = computed(() => {
  return SECURITY_QUESTIONS[questionIndex.value]?.question || ''
})

// 检查邮箱是否存在并获取安全问题
async function handleCheckEmail() {
  loading.value = true
  error.value = ''

  try {
    const result = await getSecurityQuestion(form.email)
    questionIndex.value = result.questionIndex
    step.value = 2
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : '该邮箱未注册'
    error.value = errorMessage
  } finally {
    loading.value = false
  }
}

// 验证安全问题答案
async function handleVerifyAnswer() {
  loading.value = true
  error.value = ''

  try {
    const valid = await verifySecurityQuestion(form.email, questionIndex.value, form.answer)
    if (valid) {
      step.value = 3
    } else {
      error.value = '安全问题答案错误'
    }
  } catch {
    error.value = '验证失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

// 重置密码
async function handleResetPassword() {
  if (form.newPassword !== form.confirmPassword) {
    error.value = '两次输入的密码不一致'
    return
  }

  if (form.newPassword.length < 6) {
    error.value = '密码长度至少6位'
    return
  }

  loading.value = true
  error.value = ''

  try {
    await resetPassword({
      email: form.email,
      securityQuestion: questionIndex.value,
      securityAnswer: form.answer,
      newPassword: form.newPassword
    })
    alert('密码重置成功，请使用新密码登录')
    router.push('/login')
  } catch {
    error.value = '密码重置失败，请稍后重试'
  } finally {
    loading.value = false
  }
}
</script>
