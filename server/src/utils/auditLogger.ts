/**
 * 中集智历 - 审计日志工具
 * 用于记录任务状态变更、字段修改等操作日志
 */
import prisma from '../config/database.js'

// 支持的审计动作类型
export type AuditAction =
  | 'TASK_CREATED'
  | 'STATUS_CHANGE'
  | 'FIELD_UPDATE'
  | 'ASSIGNEE_CHANGE'
  | 'PRIORITY_CHANGE'
  | 'TASK_DELETED'
  | 'TASK_ARCHIVED'
  | 'TASK_RESTORED'
  | 'BATCH_UPDATE'

// 需要跟踪的字段配置
const TRACKED_FIELDS: Record<string, { label: string; action: AuditAction }> = {
  status: { label: '状态', action: 'STATUS_CHANGE' },
  priority: { label: '优先级', action: 'PRIORITY_CHANGE' },
  assigneeId: { label: '负责人', action: 'ASSIGNEE_CHANGE' },
  dueDate: { label: '截止日期', action: 'FIELD_UPDATE' },
  title: { label: '标题', action: 'FIELD_UPDATE' },
  description: { label: '描述', action: 'FIELD_UPDATE' },
  visibility: { label: '可见性', action: 'FIELD_UPDATE' },
  categoryId: { label: '分类', action: 'FIELD_UPDATE' },
}

// 状态映射
const STATUS_MAP: Record<string, string> = {
  TODO: '待办',
  IN_PROGRESS: '进行中',
  DONE: '已完成',
  CANCELLED: '已取消'
}

// 优先级映射
const PRIORITY_MAP: Record<string, string> = {
  HIGH: '高',
  MEDIUM: '中',
  LOW: '低'
}

// 可见性映射
const VISIBILITY_MAP: Record<string, string> = {
  PUBLIC: '公开',
  PRIVATE: '私密'
}

/**
 * 格式化字段值的可读文本
 */
function formatFieldValue(field: string, value: unknown): string {
  if (value === null || value === undefined) return '无'
  if (field === 'status') return STATUS_MAP[value as string] || String(value)
  if (field === 'priority') return PRIORITY_MAP[value as string] || String(value)
  if (field === 'visibility') return VISIBILITY_MAP[value as string] || String(value)
  if (field === 'dueDate' && value instanceof Date) {
    return value.toISOString().split('T')[0]
  }
  if (field === 'dueDate' && typeof value === 'string') {
    return value.split('T')[0]
  }
  return String(value)
}

/**
 * 写入单条审计日志
 */
export async function writeAuditLog(params: {
  userId: string
  action: AuditAction | string
  targetType: string
  targetId: string
  details?: Record<string, unknown>
  ipAddress?: string
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId: params.userId,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      details: params.details ? JSON.stringify(params.details) : null,
      ipAddress: params.ipAddress || null
    }
  })
}

/**
 * 对比任务字段变更并写入审计日志
 * 会自动检测所有被跟踪字段的变更，每处变更生成一条记录
 */
export async function logTaskChanges(params: {
  userId: string
  taskId: string
  oldTask: Record<string, unknown>
  updates: Record<string, unknown>
  ipAddress?: string
}): Promise<void> {
  const { userId, taskId, oldTask, updates } = params
  const logs: Promise<void>[] = []

  for (const [field, config] of Object.entries(TRACKED_FIELDS)) {
    if (updates[field] !== undefined && updates[field] !== oldTask[field]) {
      const oldValue = formatFieldValue(field, oldTask[field])
      const newValue = formatFieldValue(field, updates[field])

      logs.push(writeAuditLog({
        userId,
        action: config.action,
        targetType: 'TASK',
        targetId: taskId,
        details: {
          field,
          fieldLabel: config.label,
          oldValue,
          newValue,
          oldRaw: oldTask[field],
          newRaw: updates[field]
        },
        ipAddress: params.ipAddress
      }))
    }
  }

  // 并行写入所有变更日志
  if (logs.length > 0) {
    await Promise.all(logs)
  }
}

/**
 * 获取状态的可读文本
 */
export function getStatusText(status: string): string {
  return STATUS_MAP[status] || status
}
