/**
 * 中集智历 - 通知类型定义
 */

// 通知类型
export type NotificationType =
  | 'TASK_ASSIGNED'
  | 'TASK_DUE'
  | 'TASK_STATUS_CHANGED'
  | 'TASK_COMMENT'
  | 'PROJECT_INVITE'
  | 'PROJECT_JOIN_REQUEST'
  | 'PROJECT_JOIN_APPROVED'
  | 'PROJECT_JOIN_REJECTED'
  | 'PROJECT_UPDATED'

// 关联类型
export type RelatedType = 'TASK' | 'PROJECT' | 'COMMENT' | 'USER'

// 通知基础信息
export interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  content: string | null
  relatedType: RelatedType | null
  relatedId: string | null
  isRead: boolean
  createdAt: string
}

// 通知类型显示名称
export const NOTIFICATION_TYPE_NAMES: Record<NotificationType, string> = {
  TASK_ASSIGNED: '任务指派',
  TASK_DUE: '任务即将到期',
  TASK_STATUS_CHANGED: '任务状态变更',
  TASK_COMMENT: '任务有新评论',
  PROJECT_INVITE: '项目邀请',
  PROJECT_JOIN_REQUEST: '加入项目申请',
  PROJECT_JOIN_APPROVED: '加入申请通过',
  PROJECT_JOIN_REJECTED: '加入申请拒绝',
  PROJECT_UPDATED: '项目信息变更'
}
