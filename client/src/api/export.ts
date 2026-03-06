/**
 * 中集智历 - 导出相关API
 */
import request from '@/utils/request'

// 导出参数类型
export interface ExportParams {
  startDate?: string
  endDate?: string
  projectId?: string
  status?: string
  summaryType?: 'weekly' | 'monthly' | 'quarterly'
}

/**
 * 导出ICS日历文件
 * @param params 导出参数
 * @returns Promise<Blob>
 */
export async function exportICS(params?: ExportParams): Promise<Blob> {
  const query = buildQueryString(params)
  const response = await request.get(`/export/ics${query}`, {
    responseType: 'blob'
  })
  return response as unknown as Blob
}

/**
 * 导出Excel/CSV任务列表
 * @param params 导出参数
 * @returns Promise<Blob>
 */
export async function exportExcel(params?: ExportParams): Promise<Blob> {
  const query = buildQueryString(params)
  const response = await request.get(`/export/excel${query}`, {
    responseType: 'blob'
  })
  return response as unknown as Blob
}

/**
 * 导出PDF工作总结
 * @param params 导出参数
 * @returns Promise<Blob>
 */
export async function exportPDF(params?: ExportParams): Promise<Blob> {
  const query = buildQueryString(params)
  const response = await request.get(`/export/pdf${query}`, {
    responseType: 'blob'
  })
  return response as unknown as Blob
}

/**
 * 构建URL查询字符串
 */
function buildQueryString(params?: ExportParams): string {
  if (!params) return ''

  const queryParts: string[] = []

  if (params.startDate) {
    queryParts.push(`startDate=${encodeURIComponent(params.startDate)}`)
  }
  if (params.endDate) {
    queryParts.push(`endDate=${encodeURIComponent(params.endDate)}`)
  }
  if (params.projectId) {
    queryParts.push(`projectId=${encodeURIComponent(params.projectId)}`)
  }
  if (params.status) {
    queryParts.push(`status=${encodeURIComponent(params.status)}`)
  }
  if (params.summaryType) {
    queryParts.push(`summaryType=${encodeURIComponent(params.summaryType)}`)
  }

  return queryParts.length > 0 ? `?${queryParts.join('&')}` : ''
}

/**
 * 下载Blob文件
 * @param blob Blob对象
 * @param filename 文件名
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

/**
 * 导出并下载ICS日历文件
 */
export async function downloadICS(params?: ExportParams): Promise<void> {
  const blob = await exportICS(params)
  const date = new Date().toISOString().split('T')[0]
  downloadBlob(blob, `calendar-${date}.ics`)
}

/**
 * 导出并下载Excel/CSV文件
 */
export async function downloadExcel(params?: ExportParams): Promise<void> {
  const blob = await exportExcel(params)
  const date = new Date().toISOString().split('T')[0]
  downloadBlob(blob, `tasks-${date}.csv`)
}

/**
 * 导出并下载PDF/Markdown工作总结
 */
export async function downloadPDF(params?: ExportParams): Promise<void> {
  const blob = await exportPDF(params)
  const date = new Date().toISOString().split('T')[0]
  downloadBlob(blob, `work-summary-${date}.md`)
}
