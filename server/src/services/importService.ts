/**
 * 中集智历 - R0 §3 任务批量导入 service
 *
 * 职责：
 * - 收集上下文 (有效 project / user / category id 集合)
 * - 调 parser 拿 valid + invalid
 * - 写库 (单一 prisma.$transaction,整批回滚)
 * - 生成失败报告 (exceljs) → 写 uploads/import-reports/<uuid>.xlsx
 * - 清理过期报告 (3 天前)
 */
import ExcelJS from 'exceljs'
import path from 'node:path'
import fs from 'node:fs/promises'
import { v4 as uuidv4 } from 'uuid'
import prisma from '../config/database.js'
import { ApiError } from '../middlewares/errorHandler.js'
import {
  parseTaskImport,
  HEADER_ROW,
  TOTAL_COLUMNS,
  extractMentionedUsers,
  type RawRow,
  type ParseContext
} from '../utils/taskImportParser.js'
import {
  PRIORITY_DISPLAY_LABELS,
  type TaskInput
} from '../utils/taskImportTypes.js'

/** 报告目录 (相对 cwd, 跟 /uploads 静态服务同源) */
export const REPORT_DIR = path.join(process.cwd(), 'uploads', 'import-reports')

/** 报告保留天数 */
const REPORT_TTL_DAYS = 3

/**
 * 收集解析上下文 (有效 id 集合)
 * - 系统管理员: 所有未归档项目 + 所有未禁用用户
 * - 普通用户: 自己作为成员的项目 + 所有未禁用用户
 */
export async function buildParseContext(userId: string, isAdmin: boolean): Promise<ParseContext> {
  // 项目: 系统管理员看所有未归档; 否则看自己作为成员的项目
  const projectWhere = isAdmin
    ? { isArchived: false, deletedAt: null }
    : { isArchived: false, deletedAt: null, OR: [{ ownerId: userId }, { members: { some: { userId } } }] }

  const projects = await prisma.project.findMany({
    where: projectWhere,
    select: { id: true }
  })
  const validProjectIds = new Set(projects.map(p => p.id))

  // 用户: 所有未禁用
  const users = await prisma.user.findMany({
    where: { isBanned: false },
    select: { id: true }
  })
  const validUserIds = new Set(users.map(u => u.id))

  // 分类: 按 projectId 索引 (系统分类 isSystem=true 也算, projectId=null)
  const categories = await prisma.taskCategory.findMany({
    select: { id: true, projectId: true }
  })
  const validCategoryIdsByProject = new Map<string, Set<string>>()
  for (const c of categories) {
    // 系统分类 (projectId=null) 适用于所有项目
    const targets = c.projectId ? [c.projectId] : Array.from(validProjectIds)
    for (const pid of targets) {
      let set = validCategoryIdsByProject.get(pid)
      if (!set) {
        set = new Set<string>()
        validCategoryIdsByProject.set(pid, set)
      }
      set.add(c.id)
    }
  }

  return { validProjectIds, validUserIds, validCategoryIdsByProject }
}

/** 把 xlsx buffer 解析成二维表 (rows[0]=表头) */
export async function xlsxBufferToRows(buffer: Buffer): Promise<RawRow[]> {
  const workbook = new ExcelJS.Workbook()
  // exceljs 的 xlsx.load 需要流/buffer
  try {
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer)
  } catch {
    // 解析失败 (空 buffer / 非 xlsx) → 返回空表, parser 自然给 0/0
    return []
  }
  const sheet = workbook.worksheets[0]
  if (!sheet) return []

  const rows: RawRow[] = []
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const cells: (string | number | Date | null)[] = []
    for (let c = 1; c <= TOTAL_COLUMNS; c++) {
      const cell = row.getCell(c)
      const v = cell.value
      if (v === null || v === undefined) {
        cells.push(null)
      } else if (v instanceof Date) {
        cells.push(v)
      } else if (typeof v === 'object') {
        // 富文本/超链接: 提取 text
        const r = v as { text?: string; result?: string | number }
        cells.push(r.text ?? r.result ?? null)
      } else if (typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean') {
        cells.push(v as never)
      } else {
        cells.push(String(v))
      }
    }
    rows.push(cells)
  })
  return rows
}

/** 预览: 解析 xlsx → valid/invalid,不写库 */
export async function previewImport(
  userId: string,
  isAdmin: boolean,
  buffer: Buffer
): Promise<{ valid: Array<{ row: number; parsed: TaskInput }>; invalid: Array<{ row: number; errors: string[] }> }> {
  const ctx = await buildParseContext(userId, isAdmin)
  const rows = await xlsxBufferToRows(buffer)
  return parseTaskImport(rows, ctx)
}

export interface ImportSuccess {
  success: true
  imported: number
  taskIds: string[]
  rows: Array<{ row: number; parsed: TaskInput; taskId: string }>
}

export interface ImportFailure {
  success: false
  imported: 0
  failed: number
  errors: Array<{ row: number; message: string }>
  failureReportUrl?: string
}

/**
 * 执行导入:
 * - 重新解析 (防止 preview 之后被改过)
 * - 收集 collaborator @user 引用
 * - 单一 prisma.$transaction (整批回滚)
 * - 全部成功 → 返回 success
 * - 任何数据库层错误 → 回滚 + 生成失败报告
 */
export async function commitImport(
  userId: string,
  isAdmin: boolean,
  buffer: Buffer
): Promise<ImportSuccess | ImportFailure> {
  const ctx = await buildParseContext(userId, isAdmin)
  const rows = await xlsxBufferToRows(buffer)
  const parsed = parseTaskImport(rows, ctx)

  if (parsed.invalid.length > 0) {
    // 用户点了确认但又混了无效行 — 视为整批失败
    const reportUrl = await writeFailureReport(rows, parsed.invalid.map(i => ({ row: i.row, errors: i.errors })))
    return {
      success: false,
      imported: 0,
      failed: parsed.invalid.length,
      errors: parsed.invalid.map(i => ({ row: i.row, message: i.errors.join('; ') })),
      failureReportUrl: reportUrl
    }
  }

  if (parsed.valid.length === 0) {
    return { success: true, imported: 0, taskIds: [], rows: [] }
  }

  // 收集 @user 引用 (在事务外做,只是查表)
  const allTags = parsed.valid.flatMap(v => v.parsed.tags || [])
  const mentionedUserIds = extractMentionedUsers(allTags, ctx.validUserIds)

  try {
    const result = await prisma.$transaction(async (tx) => {
      const created: Array<{ row: number; parsed: TaskInput; taskId: string }> = []

      for (const item of parsed.valid) {
        const p = item.parsed
        const task = await tx.task.create({
          data: {
            projectId: p.projectId,
            title: p.title,
            description: p.description || null,
            startDate: null,
            dueDate: new Date(p.dueDate),
            categoryId: p.categoryId || null,
            assigneeId: p.assigneeId,
            priority: p.priority,
            status: 'TODO',
            visibility: 'PUBLIC',
            deliverable: p.deliverable || null,
            tags: p.tags && p.tags.length > 0 ? JSON.stringify(p.tags) : null,
            creatorId: userId,
            collaborators: {
              create: mentionedUserIds
                .filter(uid => uid !== p.assigneeId) // 负责人不算协作人
                .map(uid => ({ userId: uid }))
            }
          }
        })
        created.push({ row: item.row, parsed: p, taskId: task.id })
      }

      return created
    }, { timeout: 30000 })

    return {
      success: true,
      imported: result.length,
      taskIds: result.map(r => r.taskId),
      rows: result
    }
  } catch (err) {
    console.error('[task-import] transaction failed, rolling back:', err)
    const reportUrl = await writeFailureReport(rows, [
      { row: 0, errors: [`数据库写入失败: ${(err as Error).message || '未知错误'}, 整批回滚`] }
    ])
    return {
      success: false,
      imported: 0,
      failed: parsed.valid.length,
      errors: [{ row: 0, message: `整批回滚: ${(err as Error).message || '数据库错误'}` }],
      failureReportUrl: reportUrl
    }
  }
}

/**
 * 写失败报告 → uploads/import-reports/<uuid>.xlsx
 * 返回可下载的 URL (相对路径,前端拼 baseURL)
 */
export async function writeFailureReport(
  rows: RawRow[],
  errors: Array<{ row: number; errors: string[] }>
): Promise<string> {
  await fs.mkdir(REPORT_DIR, { recursive: true })

  const reportId = uuidv4()
  const filename = `${reportId}.xlsx`
  const fullPath = path.join(REPORT_DIR, filename)

  const wb = new ExcelJS.Workbook()
  wb.creator = 'cimc-calendar'
  wb.created = new Date()
  const ws = wb.addWorksheet('失败报告')

  // 表头 = 原表头 + 「错误原因」列
  const header = [...HEADER_ROW, '错误原因']
  ws.addRow(header)

  // 把错误按 row 索引成 map
  const errorMap = new Map<number, string>()
  for (const e of errors) {
    errorMap.set(e.row, e.errors.join('; '))
  }

  // 写回所有原始数据行 + 错误原因
  // 跳过表头 (rows[0])
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i] || []
    const cells: (string | number | Date | null)[] = []
    for (let c = 0; c < TOTAL_COLUMNS; c++) {
      const v = r[c]
      if (v === null || v === undefined) {
        cells.push(null)
      } else if (v instanceof Date || typeof v === 'string' || typeof v === 'number') {
        cells.push(v)
      } else {
        cells.push(String(v))
      }
    }
    const rowNum = i + 1
    const errMsg = errorMap.get(rowNum) || errorMap.get(0) || ''
    cells.push(errMsg)
    ws.addRow(cells)
  }

  // 全局错误 (row=0) — 加在末尾
  if (errorMap.has(0)) {
    const errRow: (string | null)[] = new Array(TOTAL_COLUMNS).fill(null)
    errRow.push(errorMap.get(0) || '')
    ws.addRow(errRow)
  }

  await wb.xlsx.writeFile(fullPath)

  return `/api/import/reports/${reportId}`
}

/** 读取失败报告 (用于 GET /api/import/reports/:uuid) */
export async function readFailureReport(reportId: string): Promise<{ path: string; filename: string } | null> {
  // 防路径穿越: 只允许 uuid 形式
  if (!/^[a-zA-Z0-9-]+$/.test(reportId)) {
    throw new ApiError(400, '报告 ID 格式错误')
  }
  const fullPath = path.join(REPORT_DIR, `${reportId}.xlsx`)
  try {
    await fs.access(fullPath)
    return { path: fullPath, filename: `import-failure-${reportId}.xlsx` }
  } catch {
    return null
  }
}

/** 清理 3 天前的失败报告 (可在 scheduler / 启动时调) */
export async function cleanupExpiredReports(): Promise<number> {
  let removed = 0
  try {
    await fs.mkdir(REPORT_DIR, { recursive: true })
    const files = await fs.readdir(REPORT_DIR)
    const cutoff = Date.now() - REPORT_TTL_DAYS * 24 * 60 * 60 * 1000
    for (const f of files) {
      if (!f.endsWith('.xlsx')) continue
      const full = path.join(REPORT_DIR, f)
      const stat = await fs.stat(full)
      if (stat.mtimeMs < cutoff) {
        await fs.unlink(full)
        removed++
      }
    }
  } catch (err) {
    console.error('[task-import] cleanup reports failed:', err)
  }
  return removed
}

/** 生成模板 (用于 GET /api/import/templates/tasks.xlsx) */
export async function buildTemplateBuffer(opts: {
  projects: Array<{ id: string; name: string }>
  users: Array<{ id: string; nickname: string; email: string }>
  deliverables: Array<{ id: string; name: string }>
  categories: Array<{ id: string; name: string; projectId: string | null }>
}): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'cimc-calendar'
  wb.created = new Date()
  const ws = wb.addWorksheet('任务导入模板')

  // 1) 头一行: 写满表头,含 *
  ws.addRow([...HEADER_ROW])
  // 给表头加粗
  ws.getRow(1).font = { bold: true }
  ws.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E7FF' } // 浅蓝
  }

  // 2) 数据校验 (4 个下拉: 项目 / 负责人 / 优先级 / 交付成果)
  // 用「参考」隐藏 sheet + named range (Excel/LibreOffice/Numbers 都能识别)

  if (opts.projects.length > 0) {
    const refWs = wb.addWorksheet('__ref_projects', { state: 'hidden' })
    opts.projects.forEach((p, idx) => {
      refWs.getCell(`A${idx + 1}`).value = `${p.id} | ${p.name}`
    })
    wb.definedNames.add(`__ref_projects!$A$1:$A$${opts.projects.length}`, 'projectsRef')
    for (let r = 2; r <= 1001; r++) {
      ws.getCell(`B${r}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['projectsRef']
      }
    }
  }
  if (opts.users.length > 0) {
    const refWs = wb.addWorksheet('__ref_users', { state: 'hidden' })
    opts.users.forEach((u, idx) => {
      refWs.getCell(`A${idx + 1}`).value = `${u.id} | ${u.nickname || u.email}`
    })
    wb.definedNames.add(`__ref_users!$A$1:$A$${opts.users.length}`, 'usersRef')
    for (let r = 2; r <= 1001; r++) {
      ws.getCell(`C${r}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['usersRef']
      }
    }
  }
  {
    // 优先级: 4 象限
    const refWs = wb.addWorksheet('__ref_priorities', { state: 'hidden' })
    const labels = Object.values(PRIORITY_DISPLAY_LABELS)
    labels.forEach((l, idx) => {
      refWs.getCell(`A${idx + 1}`).value = l
    })
    wb.definedNames.add(`__ref_priorities!$A$1:$A$${labels.length}`, 'priorityRef')
    for (let r = 2; r <= 1001; r++) {
      ws.getCell(`D${r}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['priorityRef']
      }
    }
  }
  if (opts.deliverables.length > 0) {
    const refWs = wb.addWorksheet('__ref_deliverables', { state: 'hidden' })
    opts.deliverables.forEach((d, idx) => {
      refWs.getCell(`A${idx + 1}`).value = d.name
    })
    wb.definedNames.add(`__ref_deliverables!$A$1:$A$${opts.deliverables.length}`, 'deliverableRef')
    for (let r = 2; r <= 1001; r++) {
      ws.getCell(`G${r}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['deliverableRef']
      }
    }
  }

  // 3) 2-3 行示例数据 (用户能直接看到格式)
  if (opts.projects.length > 0 && opts.users.length > 0) {
    const exampleDate1 = new Date()
    exampleDate1.setDate(exampleDate1.getDate() + 7)
    const exampleDate2 = new Date()
    exampleDate2.setDate(exampleDate2.getDate() + 14)

    const cat1 = opts.categories.find(c => c.projectId === opts.projects[0].id) || opts.categories.find(c => !c.projectId)
    const tags1 = `周报,@${opts.users[0].id}`

    ws.addRow([
      '示例任务 1: 提交本周工作周报',
      opts.projects[0].id,
      opts.users[0].id,
      PRIORITY_DISPLAY_LABELS.IMPORTANT_URGENT,
      exampleDate1,
      '示例描述, 请替换为真实内容',
      opts.deliverables[0]?.name || '周报',
      tags1,
      cat1?.id || ''
    ])
    if (opts.projects.length >= 1 && opts.users.length >= 1) {
      ws.addRow([
        '示例任务 2: 准备季度总结 PPT',
        opts.projects[0].id,
        opts.users[0].id,
        PRIORITY_DISPLAY_LABELS.IMPORTANT_NOT_URGENT,
        exampleDate2,
        undefined,
        undefined,
        '总结',
        undefined
      ])
    }
  }

  // 列宽
  ws.columns = [
    { width: 30 }, // A 标题
    { width: 28 }, // B 项目ID
    { width: 28 }, // C 负责人ID
    { width: 18 }, // D 优先级
    { width: 14 }, // E 截止日期
    { width: 40 }, // F 描述
    { width: 20 }, // G 交付成果
    { width: 24 }, // H 标签
    { width: 24 }  // I 分类ID
  ]

  // 注释: 把表头「任务标题*」单独加 comment 提示
  ws.getCell('A1').note = '必填; ≤200 字符'
  ws.getCell('B1').note = '必填; 在下拉中选择项目 (显示形式: ID | 名称)'
  ws.getCell('C1').note = '必填; 在下拉中选择负责人 (显示形式: ID | 昵称)'
  ws.getCell('D1').note = '必填; 4 象限之一'
  ws.getCell('E1').note = '必填; YYYY-MM-DD, 不能早于今天'
  ws.getCell('F1').note = '选填; ≤2000 字符'
  ws.getCell('G1').note = '选填; ≤500 字符; 在下拉中选择交付成果名称'
  ws.getCell('H1').note = '选填; 多个用逗号分隔; 用 @<用户ID> 简写会自动添加为协作者'
  ws.getCell('I1').note = '选填; 项目下分类 ID, 留空使用默认'

  const buf = await wb.xlsx.writeBuffer()
  return Buffer.from(buf)
}
