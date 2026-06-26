/**
 * 中集智历 - 任务批量导入类型
 *
 * 给 parser / service / 客户端共享的类型。
 */

export type TaskPriority =
  | 'IMPORTANT_URGENT'
  | 'IMPORTANT_NOT_URGENT'
  | 'URGENT_NOT_IMPORTANT'
  | 'NOT_IMPORTANT_NOT_URGENT'

export interface TaskInput {
  title: string
  description?: string
  projectId: string
  assigneeId: string
  priority: TaskPriority
  dueDate: string  // ISO
  deliverable?: string
  tags?: string[]
  categoryId?: string
}

export const PRIORITY_DISPLAY_LABELS: Record<TaskPriority, string> = {
  IMPORTANT_URGENT: '重要且紧急',
  IMPORTANT_NOT_URGENT: '重要不紧急',
  URGENT_NOT_IMPORTANT: '紧急不重要',
  NOT_IMPORTANT_NOT_URGENT: '不重要不紧急'
}

export const PRIORITY_OPTIONS_DISPLAY: readonly string[] = [
  '重要且紧急',
  '重要不紧急',
  '紧急不重要',
  '不重要不紧急'
]
