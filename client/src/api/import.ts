/**
 * 中集智历 - 任务批量导入 API
 *
 * §3: 模板下载 + 预览 + 写库 + 失败报告下载
 */
import request from '@/utils/request'

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

export interface ValidImportRow {
  row: number
  parsed: TaskInput
}

export interface InvalidImportRow {
  row: number
  errors: string[]
}

export interface PreviewResult {
  valid: ValidImportRow[]
  invalid: InvalidImportRow[]
}

export interface ImportSuccess {
  success: true
  imported: number
  taskIds: string[]
  rows: Array<{ row: number; taskId: string }>
}

export interface ImportFailure {
  success: false
  imported: 0
  failed: number
  errors: Array<{ row: number; message: string }>
  failureReportUrl?: string
}

/** 下载任务导入模板 (浏览器自动下载 .xlsx) */
export async function downloadTaskTemplate(): Promise<void> {
  const res = await request.get<ArrayBuffer>('/import/templates/tasks.xlsx', {
    responseType: 'blob'
  })
  const blob = new Blob([res as unknown as ArrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `cimc-tasks-template-${new Date().toISOString().split('T')[0]}.xlsx`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

/** 预览: 上传 xlsx, 返回 valid/invalid (不写库) */
export async function previewTaskImport(file: File): Promise<PreviewResult> {
  const form = new FormData()
  form.append('file', file)
  const res = await request.post<PreviewResult>('/tasks/import/preview', form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return (res as unknown as { data: PreviewResult }).data
}

/** 执行导入: 上传 xlsx 并写库 (单一事务, 整批回滚) */
export async function executeTaskImport(
  file: File
): Promise<ImportSuccess | ImportFailure> {
  const form = new FormData()
  form.append('file', file)
  const res = await request.post<ImportSuccess | ImportFailure>('/tasks/import', form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return (res as unknown as { data: ImportSuccess | ImportFailure }).data
}
