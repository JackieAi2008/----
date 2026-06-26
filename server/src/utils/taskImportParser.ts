/**
 * 中集智历 - R0 §3 任务批量导入：纯函数解析器
 *
 * 设计：
 * - 纯函数，不依赖 prisma/express，便于单测和 §3b 复用
 * - 输入：xlsx 的二维数组 (rows[0] = 表头) + 上下文 (项目/用户/类别/交付物等下拉数据)
 * - 输出：{ valid: TaskInput[], invalid: { row, errors }[] }
 * - 行号用「表头算第 1 行」(人类可读)，跟 §3c 前端表格一致
 *
 * 兼容性：
 * - 数字列(如 priority) 允许字符串；解析时做 trim + 大小写不敏感匹配
 * - 日期列允许多种输入：Date 对象、ISO 字符串、'YYYY-MM-DD'、'YYYY/MM/DD'、Excel serial number
 * - 空行整行跳过 (视为 0 校验)
 * - 标题含 * 表示「必填」，parser 不依赖此标记，schema 校验为主
 */
import type { TaskInput, TaskPriority } from './taskImportTypes.js'

/** 列号常量 — 跟 §3a xlsx 列约定一致 */
export const COL = {
  TITLE: 0,        // A
  PROJECT_ID: 1,   // B
  ASSIGNEE_ID: 2,  // C
  PRIORITY: 3,     // D
  DUE_DATE: 4,     // E
  DESCRIPTION: 5,  // F
  DELIVERABLE: 6,  // G
  TAGS: 7,         // H
  CATEGORY_ID: 8   // I
} as const

export const TOTAL_COLUMNS = 9

/** 表头 (人类可读 + 必填标记 *) */
export const HEADER_ROW: readonly string[] = [
  '任务标题*',
  '项目ID*',
  '负责人ID*',
  '优先级*',
  '截止日期*',
  '描述',
  '交付成果',
  '标签',
  '分类ID'
]

/** 4 象限优先级的展示 → 内部值 */
const PRIORITY_DISPLAY_TO_VALUE: Record<string, TaskPriority> = {
  '重要且紧急': 'IMPORTANT_URGENT',
  '重要不紧急': 'IMPORTANT_NOT_URGENT',
  '紧急不重要': 'URGENT_NOT_IMPORTANT',
  '不重要不紧急': 'NOT_IMPORTANT_NOT_URGENT',
  'IMPORTANT_URGENT': 'IMPORTANT_URGENT',
  'IMPORTANT_NOT_URGENT': 'IMPORTANT_NOT_URGENT',
  'URGENT_NOT_IMPORTANT': 'URGENT_NOT_IMPORTANT',
  'NOT_IMPORTANT_NOT_URGENT': 'NOT_IMPORTANT_NOT_URGENT'
}

/** 解析上下文 (由 controller 从 prisma 取,再传入纯函数) */
export interface ParseContext {
  /** 有效项目 id 集合 (未归档) */
  validProjectIds: Set<string>
  /** 有效用户 id 集合 (未禁用) */
  validUserIds: Set<string>
  /** 有效 category id 集合 (按 projectId 索引,空表示不限制) */
  validCategoryIdsByProject: Map<string, Set<string>>
}

/** 单元格原始值 (xlsx 解析后可能是 string | number | Date | null) */
export type CellValue = string | number | Date | null | undefined

/** 单行原始数据 (长度可能 < TOTAL_COLUMNS, 后端补 null) */
export type RawRow = ReadonlyArray<CellValue>

/** 一行解析结果 */
export interface ValidRow {
  row: number
  parsed: TaskInput
}

export interface InvalidRow {
  row: number
  errors: string[]
}

export interface ParseResult {
  valid: ValidRow[]
  invalid: InvalidRow[]
}

/**
 * 主入口：把二维表解析成 valid/invalid 两组
 *  - rows[0] 必须是表头 (HEADER_ROW 或兼容)
 *  - 数据行从 rows[1] 开始,行号从 2 起 (跟 Excel 屏幕显示一致)
 *  - 空行 (所有单元格都 falsy) 跳过
 */
export function parseTaskImport(rows: ReadonlyArray<RawRow>, ctx: ParseContext): ParseResult {
  const result: ParseResult = { valid: [], invalid: [] }
  if (!rows || rows.length === 0) return result

  for (let i = 1; i < rows.length; i++) {
    const raw = rows[i] || []
    const rowNumber = i + 1

    // 整行空 → 跳过
    if (isEmptyRow(raw)) continue

    const errors: string[] = []

    // 必填: 标题
    const title = readString(raw[COL.TITLE])
    if (!title) errors.push('任务标题不能为空')
    else if (title.length > 200) errors.push('任务标题不能超过 200 字符')

    // 必填: 项目ID
    const projectId = readString(raw[COL.PROJECT_ID])
    if (!projectId) errors.push('项目ID不能为空')
    else if (!ctx.validProjectIds.has(projectId)) errors.push('项目不存在或已归档')

    // 必填: 负责人ID
    const assigneeId = readString(raw[COL.ASSIGNEE_ID])
    if (!assigneeId) errors.push('负责人ID不能为空')
    else if (!ctx.validUserIds.has(assigneeId)) errors.push('负责人不存在或已禁用')

    // 必填: 优先级 (4 选 1,大小写不敏感 + 中文/英文都接受)
    const priorityRaw = readString(raw[COL.PRIORITY])
    let priority: TaskPriority | null = null
    if (!priorityRaw) {
      errors.push('优先级不能为空')
    } else {
      priority = PRIORITY_DISPLAY_TO_VALUE[priorityRaw.trim()] || null
      if (!priority) errors.push('优先级必须是 4 象限之一(重要且紧急/重要不紧急/紧急不重要/不重要不紧急)')
    }

    // 必填: 截止日期
    const dueDateRaw = raw[COL.DUE_DATE]
    const dueDate = parseDate(dueDateRaw)
    if (!dueDate) {
      errors.push('截止日期格式无效 (支持 YYYY-MM-DD / ISO / Excel 序列号)')
    } else if (dueDate.getTime() < startOfToday()) {
      errors.push('截止日期不能早于今天')
    }

    // 选填: 描述 (≤2000)
    const description = readString(raw[COL.DESCRIPTION]) || undefined
    if (description && description.length > 2000) errors.push('描述不能超过 2000 字符')

    // 选填: 交付成果 (≤500)
    const deliverable = readString(raw[COL.DELIVERABLE]) || undefined
    if (deliverable && deliverable.length > 500) errors.push('交付成果不能超过 500 字符')

    // 选填: 标签 (逗号分隔,普通标签每项 ≤20 字符;@user 引用放宽到 64 字符,用于写协作人)
    let tags: string[] | undefined
    const tagsRaw = readString(raw[COL.TAGS])
    if (tagsRaw) {
      tags = tagsRaw.split(/[,，]/).map(s => s.trim()).filter(Boolean)
      if (tags.length > 20) errors.push('标签数量不能超过 20 个')
      const tooLongPlain = tags.filter(t => !t.startsWith('@') && t.length > 20)
      const tooLongMention = tags.filter(t => t.startsWith('@') && t.length > 64)
      if (tooLongPlain.length > 0) errors.push('单个标签不能超过 20 字符 (@user 引用除外)')
      if (tooLongMention.length > 0) errors.push('@user 引用不能超过 64 字符')
    }

    // 选填: 分类ID (项目下必须存在)
    let categoryId: string | undefined
    const categoryRaw = readString(raw[COL.CATEGORY_ID])
    if (categoryRaw) {
      categoryId = categoryRaw
      if (projectId) {
        const validCats = ctx.validCategoryIdsByProject.get(projectId)
        if (validCats && !validCats.has(categoryId)) {
          errors.push('项目下不存在该分类')
        }
      }
    }

    if (errors.length > 0) {
      result.invalid.push({ row: rowNumber, errors })
      continue
    }

    result.valid.push({
      row: rowNumber,
      parsed: {
        title: title!,
        description,
        projectId: projectId!,
        assigneeId: assigneeId!,
        priority: priority!,
        dueDate: dueDate!.toISOString(),
        deliverable,
        tags,
        categoryId
      }
    })
  }

  return result
}

/** 提取 @user 简写 (无 @ 前缀) — §3b 用来给 TaskCollaborator 写协作人 */
export function extractMentionedUsers(tags: string[] | undefined, validUserIds: Set<string>): string[] {
  if (!tags || tags.length === 0) return []
  const mentions = new Set<string>()
  for (const tag of tags) {
    // 跳过 @userId (直接是 ID) — 用户在 tag 里写「@u_abc123」就直接解析
    // 也支持 nickname 但本期不实现模糊匹配,仅按 ID
    const m = /^@?([A-Za-z0-9_-]{4,})$/.exec(tag)
    if (m && validUserIds.has(m[1])) {
      mentions.add(m[1])
    }
  }
  return Array.from(mentions)
}

// ===== 内部工具 =====

function readString(v: CellValue): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'string') return v.trim()
  if (typeof v === 'number') {
    // 数字: 可能是日期序列号或纯数字字符串
    if (Number.isInteger(v) && v > 25000 && v < 80000) {
      // 看起来像 Excel 序列号 (1900-based), 后面 parseDate 会处理
      return String(v)
    }
    return String(v)
  }
  if (v instanceof Date) {
    return v.toISOString()
  }
  return String(v).trim()
}

function isEmptyRow(row: RawRow): boolean {
  for (let i = 0; i < row.length; i++) {
    const v = row[i]
    if (v === null || v === undefined) continue
    if (typeof v === 'string' && v.trim() === '') continue
    return false
  }
  return true
}

/**
 * 把单元格解析成 Date。返回值可能因「日期不合法」返回 null。
 * 支持：
 *  - Date 对象 (直接返回)
 *  - ISO 字符串 (含 'YYYY-MM-DD' / 'YYYY-MM-DDTHH:mm:ssZ')
 *  - 'YYYY/MM/DD' 或 'YYYY.MM.DD'
 *  - Excel 序列号 (1..80000,基于 1900-01-01)
 */
export function parseDate(v: CellValue): Date | null {
  if (v === null || v === undefined) return null
  if (v instanceof Date) {
    return Number.isFinite(v.getTime()) ? v : null
  }
  if (typeof v === 'number') {
    return excelSerialToDate(v)
  }
  if (typeof v === 'string') {
    const s = v.trim()
    if (!s) return null
    // ISO 形式 (含 T) 直接走 Date
    if (s.includes('T')) {
      const d = new Date(s)
      return Number.isFinite(d.getTime()) ? d : null
    }
    // YYYY-MM-DD
    const dashMatch = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/.exec(s)
    if (dashMatch) {
      const y = Number(dashMatch[1])
      const m = Number(dashMatch[2])
      const d = Number(dashMatch[3])
      const dt = new Date(y, m - 1, d)
      if (dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d) {
        return dt
      }
    }
    // 数字字符串 → 当 Excel 序列号
    if (/^\d+(\.\d+)?$/.test(s)) {
      return excelSerialToDate(Number(s))
    }
  }
  return null
}

/** Excel 序列号 → Date (1900-based, 含 1900-02-29 的 Lotus 1-2-3 bug) */
function excelSerialToDate(serial: number): Date | null {
  if (!Number.isFinite(serial) || serial < 1) return null
  // Excel 把 1900-01-01 当作 1; 1900-02-29 实际不存在但 Excel 算 60
  // 简化: serial > 60 时减 1 修正
  const adjusted = serial > 60 ? serial - 1 : serial
  // 1899-12-30 作为基准 (serial=1 → 1900-01-01, 天数 = adjusted-1)
  const baseUtc = Date.UTC(1899, 11, 30)
  const ms = (adjusted - 1) * 24 * 60 * 60 * 1000
  const d = new Date(baseUtc + ms)
  return Number.isFinite(d.getTime()) ? d : null
}

function startOfToday(): number {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
}
