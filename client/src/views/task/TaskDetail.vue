<template>
  <div class="max-w-4xl mx-auto">
    <!-- 加载状态 -->
    <div v-if="loading" class="text-center py-12 text-gray-500">
      加载中...
    </div>

    <!-- 任务详情 -->
    <div v-else-if="task">
      <!-- 头部 -->
      <div class="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div class="flex items-start justify-between mb-4">
          <div class="flex-1">
            <!-- 状态标签 -->
            <div class="flex items-center gap-2 mb-2">
              <span
                class="px-2 py-1 text-xs rounded-full"
                :class="getStatusClass(task.status)"
              >
                {{ getStatusText(task.status) }}
              </span>
              <span
                class="px-2 py-1 text-xs rounded-full"
                :class="getPriorityClass(task.priority)"
              >
                {{ getPriorityText(task.priority) }}优先级
              </span>
              <span
                v-if="task.repeat"
                class="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-700 flex items-center gap-1"
              >
                <Repeat class="w-3 h-3" />
                {{ getRepeatText(task.repeat) }}
              </span>
            </div>
            <!-- 标题 -->
            <h1 class="text-2xl font-bold text-gray-800">{{ task.title }}</h1>
            <!-- 标签 -->
            <div v-if="task.tags && task.tags.length > 0" class="flex flex-wrap gap-2 mt-2">
              <span
                v-for="tag in task.tags"
                :key="tag"
                class="px-2 py-1 text-xs rounded-full"
                :class="getTagColorClass(tag)"
              >
                {{ tag }}
              </span>
            </div>
            <!-- 项目信息 -->
            <div class="flex items-center gap-4 mt-2 text-sm text-gray-500">
              <span class="flex items-center gap-1">
                <FolderKanban class="w-4 h-4" />
                {{ task.project?.name }}
              </span>
              <span class="flex items-center gap-1">
                <User class="w-4 h-4" />
                {{ task.assignee?.nickname }}
              </span>
            </div>
          </div>
          <!-- 操作按钮 -->
          <div class="flex items-center gap-2">
            <!-- 恢复按钮（仅归档任务显示） -->
            <button
              v-if="task.isArchived"
              @click="handleUnarchive"
              :disabled="unarchiving"
              class="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              title="恢复任务"
            >
              {{ unarchiving ? '恢复中...' : '恢复任务' }}
            </button>
            <button
              @click="showEditForm = true"
              class="p-2 hover:bg-gray-100 rounded-lg"
              title="编辑"
            >
              <Pencil class="w-5 h-5 text-gray-600" />
            </button>
            <button
              @click="handleDelete"
              class="p-2 hover:bg-red-100 rounded-lg"
              title="删除"
            >
              <Trash2 class="w-5 h-5 text-red-600" />
            </button>
          </div>
        </div>

        <!-- 时间信息 -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-t border-gray-100">
          <div>
            <p class="text-xs text-gray-500">开始时间</p>
            <p class="text-sm font-medium">{{ task.startDate ? formatDateTime(task.startDate) : '未设置' }}</p>
          </div>
          <div>
            <p class="text-xs text-gray-500">截止时间</p>
            <p class="text-sm font-medium" :class="isOverdue ? 'text-red-600' : ''">
              {{ formatDateTime(task.dueDate) }}
              <span v-if="isOverdue" class="text-xs">(已逾期)</span>
            </p>
          </div>
          <div>
            <p class="text-xs text-gray-500">创建者</p>
            <p class="text-sm font-medium">{{ task.creator?.nickname }}</p>
          </div>
          <div>
            <p class="text-xs text-gray-500">创建时间</p>
            <p class="text-sm font-medium">{{ formatDate(task.createdAt) }}</p>
          </div>
        </div>

        <!-- 状态更新 -->
        <div class="pt-4 border-t border-gray-100">
          <p class="text-xs text-gray-500 mb-2">更新状态</p>
          <div class="flex gap-2">
            <button
              v-for="status in statusOptions"
              :key="status.value"
              @click="updateStatus(status.value)"
              :disabled="updatingStatus"
              class="px-3 py-1 text-sm rounded-lg border transition-colors"
              :class="[
                task.status === status.value
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-blue-600 hover:text-blue-600'
              ]"
            >
              {{ status.label }}
            </button>
          </div>
        </div>
      </div>

      <!-- 任务描述 -->
      <div class="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h2 class="text-lg font-semibold text-gray-800 mb-4">任务描述</h2>
        <p v-if="task.description" class="text-gray-600 whitespace-pre-wrap">
          {{ task.description }}
        </p>
        <p v-else class="text-gray-400">暂无描述</p>

        <!-- 交付成果 -->
        <div v-if="task.deliverable" class="mt-4 pt-4 border-t border-gray-100">
          <h3 class="text-sm font-medium text-gray-700 mb-2">交付成果</h3>
          <p class="text-gray-600">{{ task.deliverable }}</p>
        </div>
      </div>

      <!-- 协作者 -->
      <div class="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-gray-800">协作者</h2>
          <button
            @click="showAddCollaborator = true"
            class="text-sm text-blue-600 hover:text-blue-700"
          >
            + 添加协作者
          </button>
        </div>
        <div v-if="task.collaborators && task.collaborators.length > 0" class="flex flex-wrap gap-2">
          <div
            v-for="collab in task.collaborators"
            :key="collab.id"
            class="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg"
          >
            <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span class="text-sm text-blue-600">{{ collab.user?.nickname?.charAt(0) }}</span>
            </div>
            <span class="text-sm text-gray-700">{{ collab.user?.nickname }}</span>
            <button
              @click="removeCollaborator(collab.userId)"
              class="p-1 hover:bg-gray-200 rounded"
            >
              <X class="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>
        <p v-else class="text-gray-400">暂无协作者</p>
      </div>

      <!-- 评论区 -->
      <div class="bg-white rounded-lg border border-gray-200 p-6">
        <h2 class="text-lg font-semibold text-gray-800 mb-4">评论 ({{ task.comments?.length || 0 }})</h2>

        <!-- 发表评论 -->
        <div class="mb-6">
          <!-- 回复输入框 -->
          <div v-if="replyingTo" class="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm text-blue-700">
                回复 <span class="font-medium">@{{ replyingTo.user?.nickname }}</span>
              </span>
              <button
                @click="cancelReply"
                class="p-1 hover:bg-blue-100 rounded"
              >
                <X class="w-4 h-4 text-blue-600" />
              </button>
            </div>
            <textarea
              v-model="replyContent"
              rows="2"
              class="input"
              :placeholder="`回复 @${replyingTo.user?.nickname}...`"
            ></textarea>
            <div class="flex justify-end mt-2 gap-2">
              <button
                @click="cancelReply"
                class="px-3 py-1.5 text-gray-600 hover:text-gray-700"
              >
                取消
              </button>
              <button
                @click="submitReply"
                :disabled="!replyContent.trim() || submittingComment"
                class="px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {{ submittingComment ? '发送中...' : '发送回复' }}
              </button>
            </div>
          </div>

          <!-- 主评论输入框 -->
          <div v-show="!replyingTo">
            <textarea
              v-model="newComment"
              rows="3"
              class="input"
              placeholder="写下你的评论..."
            ></textarea>
            <div class="flex justify-end mt-2">
              <button
                @click="submitComment"
                :disabled="!newComment.trim() || submittingComment"
                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {{ submittingComment ? '发送中...' : '发送评论' }}
              </button>
            </div>
          </div>
        </div>

        <!-- 评论列表 -->
        <div v-if="task.comments && task.comments.length > 0" class="space-y-4">
          <!-- 顶级评论 -->
          <template v-for="comment in topLevelComments" :key="comment.id">
            <div class="p-4 bg-gray-50 rounded-lg">
              <div class="flex items-start justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span class="text-sm text-blue-600">{{ comment.user?.nickname?.charAt(0) }}</span>
                  </div>
                  <div>
                    <p class="text-sm font-medium text-gray-800">{{ comment.user?.nickname }}</p>
                    <p class="text-xs text-gray-500">{{ formatDateTime(comment.createdAt) }}</p>
                  </div>
                </div>
                <div class="flex items-center gap-1">
                  <button
                    @click="startReply(comment)"
                    class="p-1 hover:bg-gray-200 rounded"
                    title="回复"
                  >
                    <MessageCircle class="w-4 h-4 text-gray-400" />
                  </button>
                  <button
                    v-if="comment.userId === currentUserId"
                    @click="deleteComment(comment.id)"
                    class="p-1 hover:bg-gray-200 rounded"
                  >
                    <Trash2 class="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              </div>
              <p class="mt-2 text-gray-600 text-sm">{{ comment.content }}</p>

              <!-- 回复列表 -->
              <div v-if="getCommentReplies(comment.id).length > 0" class="mt-3 ml-6 pl-4 border-l-2 border-gray-200 space-y-3">
                <div
                  v-for="reply in getCommentReplies(comment.id)"
                  :key="reply.id"
                  class="py-2"
                >
                  <div class="flex items-start justify-between">
                    <div class="flex items-center gap-2">
                      <div class="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                        <span class="text-xs text-blue-600">{{ reply.user?.nickname?.charAt(0) }}</span>
                      </div>
                      <div>
                        <p class="text-sm font-medium text-gray-800">
                          {{ reply.user?.nickname }}
                          <span v-if="getReplyTarget(reply)" class="text-gray-400 font-normal">
                            回复 <span class="text-blue-600">@{{ getReplyTarget(reply) }}</span>
                          </span>
                        </p>
                        <p class="text-xs text-gray-500">{{ formatDateTime(reply.createdAt) }}</p>
                      </div>
                    </div>
                    <div class="flex items-center gap-1">
                      <button
                        @click="startReply(reply)"
                        class="p-1 hover:bg-gray-200 rounded"
                        title="回复"
                      >
                        <MessageCircle class="w-3 h-3 text-gray-400" />
                      </button>
                      <button
                        v-if="reply.userId === currentUserId"
                        @click="deleteComment(reply.id)"
                        class="p-1 hover:bg-gray-200 rounded"
                      >
                        <Trash2 class="w-3 h-3 text-gray-400" />
                      </button>
                    </div>
                  </div>
                  <p class="mt-1 text-gray-600 text-sm">{{ reply.content }}</p>
                </div>
              </div>
            </div>
          </template>
        </div>
        <div v-else class="text-center py-8 text-gray-400">
          暂无评论，快来发表第一条评论吧
        </div>
      </div>
    </div>

    <!-- 错误状态 -->
    <div v-else class="text-center py-12 text-gray-500">
      任务不存在或已被删除
      <router-link to="/calendar" class="text-blue-600 hover:text-blue-700 ml-2">
        返回日历
      </router-link>
    </div>

    <!-- 编辑任务弹窗 -->
    <TaskForm
      v-if="showEditForm"
      :task-id="taskId"
      @close="showEditForm = false"
      @saved="handleTaskUpdated"
    />
  </div>
</template>

<script setup lang="ts">
/**
 * 中集智历 - 任务详情页面
 */
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { FolderKanban, User, Pencil, Trash2, X, MessageCircle, Repeat } from 'lucide-vue-next'
import { getTask, updateTask, deleteTask, removeTaskCollaborator, unarchiveTask } from '@/api/task'
import { formatDateTime as formatDateUtil, formatDate as formatDateOnly } from '@/utils/date'
import { devLog } from '@/utils/logger'
import { getTagColorClasses } from '@/utils/tagColor'
import type { Task, TaskStatus, Comment } from '@/types/task'
import TaskForm from '@/components/task/TaskForm.vue'

const route = useRoute()
const router = useRouter()

// 状态
const loading = ref(true)
const task = ref<Task | null>(null)
const showEditForm = ref(false)
const showAddCollaborator = ref(false)
const updatingStatus = ref(false)
const newComment = ref('')
const submittingComment = ref(false)
const replyingTo = ref<Comment | null>(null)
const replyContent = ref('')
const unarchiving = ref(false)

// 计算属性
const taskId = computed(() => route.params.id as string)
const currentUserId = computed(() => localStorage.getItem('userId'))

const isOverdue = computed(() => {
  if (!task.value || task.value.status === 'DONE' || task.value.status === 'CANCELLED') return false
  return new Date(task.value.dueDate) < new Date()
})

// 获取顶级评论（非回复）
const topLevelComments = computed(() => {
  if (!task.value?.comments) return []
  return task.value.comments.filter(c => !c.replyToId)
})

// 获取指定评论的回复
function getCommentReplies(commentId: string): Comment[] {
  if (!task.value?.comments) return []
  return task.value.comments.filter(c => c.replyToId === commentId)
}

// 获取回复的目标用户名
function getReplyTarget(reply: Comment): string | null {
  if (!reply.replyToId || !task.value?.comments) return null
  const parentComment = task.value.comments.find(c => c.id === reply.replyToId)
  return parentComment?.user?.nickname || null
}

// 状态选项
const statusOptions = [
  { value: 'TODO', label: '待办' },
  { value: 'IN_PROGRESS', label: '进行中' },
  { value: 'DONE', label: '已完成' },
  { value: 'CANCELLED', label: '已取消' }
]

// 方法
function formatDateTime(dateStr: string): string {
  return formatDateUtil(dateStr, 'YYYY-MM-DD HH:mm')
}

function formatDate(dateStr: string): string {
  return formatDateOnly(dateStr, 'YYYY-MM-DD')
}

function getStatusClass(status: string): string {
  switch (status) {
    case 'TODO': return 'bg-gray-100 text-gray-700'
    case 'IN_PROGRESS': return 'bg-blue-100 text-blue-700'
    case 'DONE': return 'bg-green-100 text-green-700'
    case 'CANCELLED': return 'bg-red-100 text-red-700'
    default: return 'bg-gray-100 text-gray-700'
  }
}

function getStatusText(status: string): string {
  switch (status) {
    case 'TODO': return '待办'
    case 'IN_PROGRESS': return '进行中'
    case 'DONE': return '已完成'
    case 'CANCELLED': return '已取消'
    default: return '待办'
  }
}

function getPriorityClass(priority: string): string {
  switch (priority) {
    case 'HIGH': return 'bg-red-100 text-red-700'
    case 'MEDIUM': return 'bg-yellow-100 text-yellow-700'
    case 'LOW': return 'bg-gray-100 text-gray-600'
    default: return 'bg-gray-100 text-gray-600'
  }
}

function getPriorityText(priority: string): string {
  switch (priority) {
    case 'HIGH': return '高'
    case 'MEDIUM': return '中'
    case 'LOW': return '低'
    default: return '中'
  }
}

function getRepeatText(repeat: string): string {
  switch (repeat) {
    case 'DAILY': return '每天'
    case 'WEEKLY': return '每周'
    case 'MONTHLY': return '每月'
    case 'YEARLY': return '每年'
    default: return '重复'
  }
}

function getTagColorClass(tagName: string): string {
  const colors = getTagColorClasses(tagName)
  return `${colors.bg} ${colors.text}`
}

async function fetchTask() {
  loading.value = true
  try {
    task.value = await getTask(taskId.value)
  } catch (error) {
    devLog.error('获取任务失败', error)
    task.value = null
  } finally {
    loading.value = false
  }
}

async function updateStatus(status: string) {
  if (!task.value || task.value.status === status) return

  updatingStatus.value = true
  try {
    const taskStatus = status as TaskStatus
    await updateTask(taskId.value, { status: taskStatus })
    task.value.status = taskStatus
  } catch (error) {
    devLog.error('更新状态失败', error)
    alert('更新状态失败')
  } finally {
    updatingStatus.value = false
  }
}

async function handleDelete() {
  if (!confirm('确定要删除这个任务吗？')) return

  try {
    await deleteTask(taskId.value)
    router.push('/calendar')
  } catch (error) {
    devLog.error('删除任务失败', error)
    alert('删除任务失败')
  }
}

async function removeCollaborator(userId: string) {
  if (!confirm('确定要移除这个协作者吗？')) return

  try {
    await removeTaskCollaborator(taskId.value, userId)
    task.value!.collaborators = task.value!.collaborators?.filter(c => c.userId !== userId)
  } catch (error) {
    devLog.error('移除协作者失败', error)
    alert('移除协作者失败')
  }
}

async function submitComment() {
  if (!newComment.value.trim() || !task.value) return

  submittingComment.value = true
  try {
    // 调用评论API
    const response = await fetch(`/api/tasks/${taskId.value}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ content: newComment.value })
    })
    const data = await response.json()
    if (data.success) {
      task.value.comments = task.value.comments || []
      task.value.comments.unshift(data.data)
      newComment.value = ''
    }
  } catch (error) {
    devLog.error('发送评论失败', error)
    alert('发送评论失败')
  } finally {
    submittingComment.value = false
  }
}

async function deleteComment(commentId: string) {
  if (!confirm('确定要删除这条评论吗？')) return

  try {
    const response = await fetch(`/api/tasks/${taskId.value}/comments/${commentId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
    const data = await response.json()
    if (data.success) {
      task.value!.comments = task.value!.comments?.filter(c => c.id !== commentId)
    }
  } catch (error) {
    devLog.error('删除评论失败', error)
    alert('删除评论失败')
  }
}

// 开始回复
function startReply(comment: Comment) {
  replyingTo.value = comment
  replyContent.value = ''
}

// 取消回复
function cancelReply() {
  replyingTo.value = null
  replyContent.value = ''
}

// 提交回复
async function submitReply() {
  if (!replyContent.value.trim() || !task.value || !replyingTo.value) return

  submittingComment.value = true
  try {
    const response = await fetch(`/api/tasks/${taskId.value}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        content: replyContent.value,
        replyToId: replyingTo.value.id
      })
    })
    const data = await response.json()
    if (data.success) {
      task.value.comments = task.value.comments || []
      task.value.comments.unshift(data.data)
      cancelReply()
    }
  } catch (error) {
    devLog.error('发送回复失败', error)
    alert('发送回复失败')
  } finally {
    submittingComment.value = false
  }
}

function handleTaskUpdated() {
  showEditForm.value = false
  fetchTask()
}

// 恢复归档任务
async function handleUnarchive() {
  if (!task.value || !task.value.isArchived) return

  unarchiving.value = true
  try {
    await unarchiveTask(taskId.value)
    task.value.isArchived = false
    task.value.archivedAt = null
    alert('任务已恢复')
  } catch (error) {
    devLog.error('恢复任务失败', error)
    alert('恢复任务失败')
  } finally {
    unarchiving.value = false
  }
}

// 初始化
onMounted(() => {
  fetchTask()
})
</script>
