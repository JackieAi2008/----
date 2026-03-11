/**
 * 中集智历 - 任务类型定义
 */

// 任务优先级
export type Priority = 'HIGH' | 'MEDIUM' | 'LOW'

// 任务状态
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED'

// 提醒类型
export type Reminder = 'FIFTEEN_MIN' | 'ONE_HOUR' | 'ONE_DAY' | 'THREE_DAYS'

// 重复类型
export type Repeat = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'

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
  deliverable: string | null
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
  deliverable?: string
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
