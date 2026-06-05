<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg w-full max-w-md mx-4 shadow-xl">
      <!-- 头部 -->
      <div class="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 class="text-lg font-semibold text-gray-800">快速创建项目</h3>
        <button @click="$emit('close')" class="p-1 hover:bg-gray-100 rounded transition-colors">
          <X class="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <!-- 内容 -->
      <div class="p-4 space-y-4">
        <!-- 项目名称 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            项目名称 <span class="text-red-500">*</span>
          </label>
          <input
            v-model="form.name"
            type="text"
            class="input w-full"
            placeholder="请输入项目名称"
            maxlength="50"
          />
        </div>

        <!-- 项目描述 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">项目描述</label>
          <textarea
            v-model="form.description"
            class="input w-full"
            rows="2"
            placeholder="请输入项目描述（可选）"
            maxlength="200"
          ></textarea>
        </div>

        <!-- 项目分类 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            项目分类 <span class="text-red-500">*</span>
          </label>
          <select v-model="form.category" class="input w-full">
            <option value="">请选择分类</option>
            <option v-for="cat in projectCategories" :key="cat.value" :value="cat.value">
              {{ cat.label }}
            </option>
          </select>
        </div>

        <!-- 可见性 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">可见性</label>
          <div class="flex gap-3">
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                v-model="form.visibility"
                value="PUBLIC"
                class="text-blue-600"
              />
              <Globe class="w-4 h-4 text-gray-500" />
              <span class="text-sm">公开</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                v-model="form.visibility"
                value="PRIVATE"
                class="text-blue-600"
              />
              <Lock class="w-4 h-4 text-gray-500" />
              <span class="text-sm">私密</span>
            </label>
          </div>
        </div>

        <!-- 成员管理 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">添加成员</label>

          <!-- 搜索框 -->
          <div class="relative mb-2">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              v-model="searchQuery"
              type="text"
              class="input w-full pl-9"
              placeholder="搜索用户名或邮箱"
              @input="handleSearch"
            />
          </div>

          <!-- 搜索结果 -->
          <div v-if="searchResults.length > 0" class="mb-2 max-h-32 overflow-y-auto border border-gray-200 rounded-lg">
            <div
              v-for="user in searchResults"
              :key="user.id"
              class="flex items-center justify-between px-3 py-2 hover:bg-gray-50 cursor-pointer"
              @click="toggleMember(user)"
            >
              <div class="flex items-center gap-2">
                <div class="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                  <span class="text-xs text-blue-600">{{ (user.nickname || 'U')[0] }}</span>
                </div>
                <span class="text-sm">{{ user.nickname || user.email }}</span>
              </div>
              <Plus v-if="!selectedMemberIds.includes(user.id)" class="w-4 h-4 text-gray-400" />
              <Check v-else class="w-4 h-4 text-green-500" />
            </div>
          </div>

          <!-- 已选成员 -->
          <div v-if="selectedMembers.length > 0" class="flex flex-wrap gap-2">
            <span
              v-for="member in selectedMembers"
              :key="member.id"
              class="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
            >
              {{ member.nickname || member.email }}
              <button
                type="button"
                @click="removeMember(member.id)"
                class="hover:text-blue-900"
              >
                <X class="w-3 h-3" />
              </button>
            </span>
          </div>
        </div>
      </div>

      <!-- 底部按钮 -->
      <div class="flex justify-end gap-2 p-4 border-t border-gray-200">
        <button
          type="button"
          @click="$emit('close')"
          class="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          取消
        </button>
        <button
          type="button"
          @click="handleCreate"
          :disabled="!form.name.trim() || submitting"
          class="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {{ submitting ? '创建中...' : '创建项目' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 中集智历 - 快速创建项目对话框
 */
import { ref, computed } from 'vue'
import { X, Plus, Check, Search, Globe, Lock } from 'lucide-vue-next'
import { createProject, addProjectMember } from '@/api/project'
import { searchUsers } from '@/api/user'
import { useProjectStore } from '@/stores/project'
import { useToast } from '@/composables/useToast'
import type { User } from '@/types/user'
import type { Visibility, ProjectCategory } from '@/types/project'
import { PROJECT_CATEGORY_OPTIONS } from '@/types/project'

const emit = defineEmits<{
  close: []
  saved: [project: { id: string; name: string }]
}>()

const toast = useToast()
const projectStore = useProjectStore()

// 项目分类选项
const projectCategories = PROJECT_CATEGORY_OPTIONS

// 表单数据
const form = ref({
  name: '',
  description: '',
  visibility: 'PUBLIC' as Visibility,
  category: '' as ProjectCategory | ''
})

// 状态
const submitting = ref(false)
const searchQuery = ref('')
const searchResults = ref<User[]>([])
const selectedMemberIds = ref<string[]>([])

// 已选成员列表
const selectedMembers = computed(() => {
  return searchResults.value.filter(u => selectedMemberIds.value.includes(u.id))
})

// 搜索用户
let searchTimeout: ReturnType<typeof setTimeout> | null = null

async function handleSearch() {
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }

  const query = searchQuery.value.trim()
  if (!query) {
    searchResults.value = []
    return
  }

  searchTimeout = setTimeout(async () => {
    try {
      const users = await searchUsers(query)
      searchResults.value = users
    } catch (error) {
      console.error('搜索用户失败:', error)
    }
  }, 300)
}

// 切换成员选择
function toggleMember(user: User) {
  const index = selectedMemberIds.value.indexOf(user.id)
  if (index === -1) {
    selectedMemberIds.value.push(user.id)
  } else {
    selectedMemberIds.value.splice(index, 1)
  }
}

// 移除成员
function removeMember(userId: string) {
  selectedMemberIds.value = selectedMemberIds.value.filter(id => id !== userId)
}

// 创建项目
async function handleCreate() {
  if (!form.value.name.trim()) {
    toast.error('请输入项目名称')
    return
  }

  if (!form.value.category) {
    toast.error('请选择项目分类')
    return
  }

  submitting.value = true

  try {
    // 创建项目
    const project = await createProject({
      name: form.value.name.trim(),
      description: form.value.description.trim() || undefined,
      visibility: form.value.visibility,
      category: form.value.category as ProjectCategory
    })

    // 添加成员
    for (const userId of selectedMemberIds.value) {
      try {
        await addProjectMember(project.id, userId)
      } catch (error) {
        console.error('添加成员失败:', error)
      }
    }

    // 刷新项目列表
    await projectStore.fetchProjects()

    toast.success('项目创建成功')

    emit('saved', { id: project.id, name: project.name })
  } catch (error) {
    console.error('创建项目失败:', error)
    toast.error('创建项目失败，请稍后重试')
  } finally {
    submitting.value = false
  }
}
</script>
