/**
 * 中集智历 - 任务类型定义
 */

// 任务优先级（四象限）
export type Priority = 'IMPORTANT_URGENT' | 'IMPORTANT_NOT_URGENT' | 'URGENT_NOT_IMPORTANT' | 'NOT_IMPORTANT_NOT_URGENT'

// 任务状态
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED'

// 提醒类型
export type Reminder = 'TWO_WEEKS' | 'ONE_WEEK' | 'THREE_DAYS' | 'ONE_DAY'

// 重复类型
export type Repeat = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'

// 任务可见性（固定为公开）
export type TaskVisibility = 'PUBLIC' | 'PRIVATE'

// 优先级显示映射
export const PRIORITY_MAP: Record<Priority, { label: string; color: string; bgColor: string }> = {
  IMPORTANT_URGENT: { label: '重要且紧急', color: 'text-red-700', bgColor: 'bg-red-100' },
  IMPORTANT_NOT_URGENT: { label: '重要不紧急', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  URGENT_NOT_IMPORTANT: { label: '紧急不重要', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  NOT_IMPORTANT_NOT_URGENT: { label: '不重要不紧急', color: 'text-gray-600', bgColor: 'bg-gray-100' },
}

// 提醒时间显示映射
export const REMINDER_MAP: Record<Reminder, string> = {
  TWO_WEEKS: '提前两周',
  ONE_WEEK: '提前一周',
  THREE_DAYS: '提前三天',
  ONE_DAY: '提前一天',
}

// 固定标签选项
export const FIXED_TAGS = ['常规工作', '改善工作', '创新工作'] as const
export type FixedTag = typeof FIXED_TAGS[number]

// 固定交付成果选项
export const DELIVERABLE_OPTIONS = ['活动新闻', '活动方案'] as const

// 任务基础信息
export interface Task {
  id: string
  projectId: string
  title: string
  description: string | null
  startDate: string | null
  dueDate: string
  categoryId: string | null
  assigneeId: string
  priority: Priority
  status: TaskStatus
  visibility: TaskVisibility
  deliverable: string | null
  completedAt: string | null
  completedBy: string | null
  completionNote: string | null
  tags: string[] | null
  reminder: Reminder | null
  repeat: Repeat | null
  creatorId: string
  isArchived: boolean
  archivedAt: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  // 关联数据
  project?: {
    id: string
    name: string
    category?: string | null
  }
  category?: TaskCategory
  assignee?: {
    id: string
    nickname: string
    avatar: string | null
    department?: {
      id: string
      name: string
    }
  }
  creator?: {
    id: string
    nickname: string
  }
  collaborators?: TaskCollaborator[]
  comments?: Comment[]
  attachments?: Attachment[]
  evaluations?: Evaluation[]
}

// 任务类别
export interface TaskCategory {
  id: string
  projectId: string | null
  name: string
  color: string
  isSystem: boolean
}

// 任务协作者
export interface TaskCollaborator {
  id: string
  taskId: string
  userId: string
  user?: {
    id: string
    nickname: string
    avatar: string | null
  }
}

// 评论
export interface Comment {
  id: string
  taskId: string
  userId: string
  content: string
  mentions: string[] | null
  replyToId: string | null
  images: string[] | null
  createdAt: string
  deletedAt: string | null
  user?: {
    id: string
    nickname: string
    avatar: string | null
  }
}

// 附件
export interface Attachment {
  id: string
  taskId: string
  filename: string
  originalName: string
  mimeType: string
  size: number
  path: string
  uploaderId: string
  createdAt: string
}

// 评价
export interface Evaluation {
  id: string
  taskId: string
  evaluatorId: string
  targetUserId: string
  projectId: string
  rating: number
  comment: string | null
  createdAt: string
  updatedAt: string
  evaluator?: {
    id: string
    nickname: string
  }
  targetUser?: {
    id: string
    nickname: string
    avatar: string | null
  }
  task?: {
    id: string
    title: string
  }
}

// 创建任务请求
export interface CreateTaskRequest {
  projectId: string
  title: string
  description?: string
  startDate?: string
  dueDate: string
  categoryId?: string
  assigneeId: string
  priority?: Priority
  visibility?: TaskVisibility
  deliverable?: string
  tags?: string[]
  reminder?: Reminder
  repeat?: Repeat
  collaboratorIds?: string[]
}

// 更新任务请求
export interface UpdateTaskRequest {
  title?: string
  description?: string
  startDate?: string
  dueDate?: string
  categoryId?: string
  assigneeId?: string
  priority?: Priority
  status?: TaskStatus
  visibility?: TaskVisibility
  deliverable?: string
  completionNote?: string
  tags?: string[]
  reminder?: Reminder
  repeat?: Repeat
}

// 任务模板
export interface TaskTemplate {
  id: string
  title: string
  description: string | null
  priority: Priority
  categoryId: string | null
  defaultAssignee: string | null
  creatorId: string
  createdAt: string
  updatedAt: string
  // 关联数据
  category?: TaskCategory
  creator?: {
    id: string
    nickname: string
  }
}

// 创建模板请求
export interface CreateTemplateRequest {
  title: string
  description?: string
  priority?: Priority
  categoryId?: string
  defaultAssignee?: string
}

// 更新模板请求
export interface UpdateTemplateRequest {
  title?: string
  description?: string
  priority?: Priority
  categoryId?: string
  defaultAssignee?: string
}
