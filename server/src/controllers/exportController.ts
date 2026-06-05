/**
 * 中集智历 - 导出控制器
 * 支持ICS日历导出、Excel导出、PDF导出
 */
import { Response } from 'express'
import prisma from '../config/database.js'
import { AuthRequest } from '../middlewares/auth.js'

/**
 * 将日期转换为ICS格式 (YYYYMMDDTHHMMSSZ)
 */
function formatICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '') + 'Z'
}

/**
 * 转义ICS文本中的特殊字符
 */
function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

/**
 * 获取任务优先级对应的ICS优先级
 */
function getICSPriority(priority: string): number {
  switch (priority) {
    case 'IMPORTANT_URGENT':
      return 1
    case 'URGENT_NOT_IMPORTANT':
      return 3
    case 'IMPORTANT_NOT_URGENT':
      return 5
    case 'NOT_IMPORTANT_NOT_URGENT':
      return 9
    default:
      return 5
  }
}

/**
 * 导出ICS日历文件
 * GET /api/export/ics
 */
export async function exportICS(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId!
    const { startDate, endDate, projectId } = req.query

    // 构建查询条件
    const whereClause: Record<string, unknown> = {
      OR: [
        { assigneeId: userId },
        { collaborators: { some: { userId } } }
      ],
      deletedAt: null
    }

    // 添加日期范围过滤
    if (startDate || endDate) {
      whereClause.dueDate = {}
      if (startDate) {
        (whereClause.dueDate as Record<string, unknown>).gte = new Date(startDate as string)
      }
      if (endDate) {
        (whereClause.dueDate as Record<string, unknown>).lte = new Date(endDate as string)
      }
    }

    // 添加项目过滤
    if (projectId) {
      whereClause.projectId = projectId as string
    }

    // 获取任务列表
    const tasks = await prisma.task.findMany({
      where: whereClause,
      include: {
        project: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, color: true } },
        assignee: { select: { id: true, nickname: true, email: true } }
      },
      orderBy: { dueDate: 'asc' }
    })

    // 生成ICS内容
    const icsLines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//CIMC Calendar//中集智历//CN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:中集智历任务日历',
      'X-WR-TIMEZONE:Asia/Shanghai'
    ]

    // 为每个任务创建VEVENT
    for (const task of tasks) {
      const startDate = task.startDate ? new Date(task.startDate) : new Date(task.dueDate)
      const endDate = new Date(task.dueDate)

      // 设置为全天事件或带时间的事件
      const isAllDay = !task.startDate

      icsLines.push('BEGIN:VEVENT')
      icsLines.push(`UID:${task.id}@cimc-calendar.com`)
      icsLines.push(`DTSTAMP:${formatICSDate(new Date())}`)

      if (isAllDay) {
        // 全天事件格式
        const dateStr = endDate.toISOString().split('T')[0].replace(/-/g, '')
        icsLines.push(`DTSTART;VALUE=DATE:${dateStr}`)
        icsLines.push(`DTEND;VALUE=DATE:${dateStr}`)
      } else {
        icsLines.push(`DTSTART:${formatICSDate(startDate)}`)
        icsLines.push(`DTEND:${formatICSDate(endDate)}`)
      }

      icsLines.push(`SUMMARY:${escapeICSText(task.title)}`)

      if (task.description) {
        icsLines.push(`DESCRIPTION:${escapeICSText(task.description)}`)
      }

      if (task.project) {
        icsLines.push(`CATEGORIES:${escapeICSText(task.project.name)}`)
      }

      // 设置优先级
      icsLines.push(`PRIORITY:${getICSPriority(task.priority)}`)

      // 设置状态
      let status = 'TENTATIVE'
      if (task.status === 'DONE') {
        status = 'CONFIRMED'
      } else if (task.status === 'CANCELLED') {
        status = 'CANCELLED'
      }
      icsLines.push(`STATUS:${status}`)

      // 添加提醒
      if (task.reminder && task.status !== 'DONE' && task.status !== 'CANCELLED') {
        let reminderMinutes = 0
        switch (task.reminder) {
          case 'FIFTEEN_MIN':
            reminderMinutes = 15
            break
          case 'ONE_HOUR':
            reminderMinutes = 60
            break
          case 'ONE_DAY':
            reminderMinutes = 1440
            break
          case 'THREE_DAYS':
            reminderMinutes = 4320
            break
        }

        icsLines.push('BEGIN:VALARM')
        icsLines.push('ACTION:DISPLAY')
        icsLines.push(`DESCRIPTION:${escapeICSText(task.title)} - 任务提醒`)
        icsLines.push(`TRIGGER:-PT${reminderMinutes}M`)
        icsLines.push('END:VALARM')
      }

      icsLines.push('END:VEVENT')
    }

    icsLines.push('END:VCALENDAR')

    const icsContent = icsLines.join('\r\n')

    // 设置响应头
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="cimc-calendar-${new Date().toISOString().split('T')[0]}.ics"`)
    res.setHeader('Content-Length', Buffer.byteLength(icsContent, 'utf-8'))

    res.send(icsContent)
  } catch (error) {
    console.error('导出ICS失败:', error)
    res.status(500).json({
      success: false,
      message: '导出ICS失败'
    })
  }
}

/**
 * 导出Excel任务列表
 * GET /api/export/excel
 * 注意：需要安装 exceljs 库
 */
export async function exportExcel(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId!
    const { startDate, endDate, projectId, status } = req.query

    // 构建查询条件
    const whereClause: Record<string, unknown> = {
      OR: [
        { assigneeId: userId },
        { collaborators: { some: { userId } } }
      ],
      deletedAt: null
    }

    // 添加日期范围过滤
    if (startDate || endDate) {
      whereClause.dueDate = {}
      if (startDate) {
        (whereClause.dueDate as Record<string, unknown>).gte = new Date(startDate as string)
      }
      if (endDate) {
        (whereClause.dueDate as Record<string, unknown>).lte = new Date(endDate as string)
      }
    }

    // 添加项目过滤
    if (projectId) {
      whereClause.projectId = projectId as string
    }

    // 添加状态过滤
    if (status) {
      whereClause.status = status as string
    }

    // 获取任务列表
    const tasks = await prisma.task.findMany({
      where: whereClause,
      include: {
        project: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, color: true } },
        assignee: { select: { id: true, nickname: true } },
        creator: { select: { id: true, nickname: true } }
      },
      orderBy: { dueDate: 'asc' }
    })

    // 状态映射
    const statusMap: Record<string, string> = {
      'TODO': '待办',
      'IN_PROGRESS': '进行中',
      'DONE': '已完成',
      'CANCELLED': '已取消'
    }

    // 优先级映射（四象限）
    const priorityMap: Record<string, string> = {
      'IMPORTANT_URGENT': '重要且紧急',
      'IMPORTANT_NOT_URGENT': '重要不紧急',
      'URGENT_NOT_IMPORTANT': '紧急不重要',
      'NOT_IMPORTANT_NOT_URGENT': '不重要不紧急'
    }

    // 生成CSV内容（简化版，不依赖exceljs）
    // 如果需要完整的Excel功能，需要安装 exceljs 库
    const headers = [
      '任务标题',
      '描述',
      '项目',
      '分类',
      '状态',
      '优先级',
      '负责人',
      '创建人',
      '开始日期',
      '截止日期',
      '交付物',
      '标签',
      '创建时间'
    ]

    const csvRows = [headers.join(',')]

    for (const task of tasks) {
      const row = [
        `"${(task.title || '').replace(/"/g, '""')}"`,
        `"${(task.description || '').replace(/"/g, '""')}"`,
        `"${(task.project?.name || '').replace(/"/g, '""')}"`,
        `"${(task.category?.name || '').replace(/"/g, '""')}"`,
        `"${statusMap[task.status] || task.status}"`,
        `"${priorityMap[task.priority] || task.priority}"`,
        `"${(task.assignee?.nickname || '').replace(/"/g, '""')}"`,
        `"${(task.creator?.nickname || '').replace(/"/g, '""')}"`,
        task.startDate ? `"${new Date(task.startDate).toLocaleDateString('zh-CN')}"` : '""',
        `"${new Date(task.dueDate).toLocaleDateString('zh-CN')}"`,
        `"${(task.deliverable || '').replace(/"/g, '""')}"`,
        `"${(Array.isArray(task.tags) ? task.tags.join('; ') : (task.tags || '')).replace(/"/g, '""')}"`,
        `"${new Date(task.createdAt).toLocaleString('zh-CN')}"`
      ]
      csvRows.push(row.join(','))
    }

    // 添加BOM以支持中文
    const csvContent = '\uFEFF' + csvRows.join('\n')

    // 设置响应头（以Excel兼容的CSV格式输出）
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="tasks-${new Date().toISOString().split('T')[0]}.csv"`)
    res.setHeader('Content-Length', Buffer.byteLength(csvContent, 'utf-8'))

    res.send(csvContent)
  } catch (error) {
    console.error('导出Excel失败:', error)
    res.status(500).json({
      success: false,
      message: '导出Excel失败'
    })
  }
}

/**
 * 导出PDF工作总结
 * GET /api/export/pdf
 * 注意：需要安装 pdfkit 库
 */
export async function exportPDF(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId!
    const { startDate, endDate, summaryType = 'weekly' } = req.query

    // 计算日期范围
    const now = new Date()
    let start: Date
    let end = new Date(now)
    let title: string

    if (startDate && endDate) {
      start = new Date(startDate as string)
      end = new Date(endDate as string)
      title = `工作总结 (${start.toLocaleDateString('zh-CN')} - ${end.toLocaleDateString('zh-CN')})`
    } else {
      switch (summaryType as string) {
        case 'weekly':
          start = new Date(now)
          start.setDate(now.getDate() - 7)
          title = `周总结 (${start.toLocaleDateString('zh-CN')} - ${end.toLocaleDateString('zh-CN')})`
          break
        case 'monthly':
          start = new Date(now.getFullYear(), now.getMonth(), 1)
          title = `月总结 (${now.getFullYear()}年${now.getMonth() + 1}月)`
          break
        case 'quarterly':
          const quarter = Math.floor(now.getMonth() / 3)
          start = new Date(now.getFullYear(), quarter * 3, 1)
          title = `季度总结 (${now.getFullYear()}年第${quarter + 1}季度)`
          break
        default:
          start = new Date(now)
          start.setDate(now.getDate() - 7)
          title = `工作总结 (${start.toLocaleDateString('zh-CN')} - ${end.toLocaleDateString('zh-CN')})`
      }
    }

    start.setHours(0, 0, 0, 0)
    end.setHours(23, 59, 59, 999)

    // 获取任务统计
    const [statusStats, projectStats, tasks] = await Promise.all([
      // 按状态统计
      prisma.task.groupBy({
        by: ['status'],
        where: {
          OR: [
            { assigneeId: userId },
            { collaborators: { some: { userId } } }
          ],
          dueDate: { gte: start, lte: end },
          deletedAt: null
        },
        _count: true
      }),
      // 按项目统计
      prisma.task.groupBy({
        by: ['projectId'],
        where: {
          OR: [
            { assigneeId: userId },
            { collaborators: { some: { userId } } }
          ],
          dueDate: { gte: start, lte: end },
          deletedAt: null
        },
        _count: true
      }),
      // 获取已完成任务列表
      prisma.task.findMany({
        where: {
          OR: [
            { assigneeId: userId },
            { collaborators: { some: { userId } } }
          ],
          dueDate: { gte: start, lte: end },
          deletedAt: null
        },
        include: {
          project: { select: { name: true } },
          assignee: { select: { nickname: true } }
        },
        orderBy: { dueDate: 'asc' }
      })
    ])

    // 获取项目名称
    const projectIds = projectStats.map(s => s.projectId)
    const projects = await prisma.project.findMany({
      where: { id: { in: projectIds } },
      select: { id: true, name: true }
    })

    // 获取用户信息
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { nickname: true, email: true }
    })

    // 计算统计数据
    const total = statusStats.reduce((sum, s) => sum + s._count, 0)
    const done = statusStats.find(s => s.status === 'DONE')?._count || 0
    const inProgress = statusStats.find(s => s.status === 'IN_PROGRESS')?._count || 0
    const todo = statusStats.find(s => s.status === 'TODO')?._count || 0
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0

    // 生成文本格式的总结（简化版，不依赖pdfkit）
    // 如果需要完整的PDF功能，需要安装 pdfkit 库
    const projectStatsWithName = projectStats.map(s => ({
      projectName: projects.find(p => p.id === s.projectId)?.name || '未知项目',
      count: s._count
    }))

    // 按状态分组任务
    const doneTasks = tasks.filter(t => t.status === 'DONE')
    const inProgressTasks = tasks.filter(t => t.status === 'IN_PROGRESS')
    const todoTasks = tasks.filter(t => t.status === 'TODO')

    // 生成Markdown格式的总结
    const mdContent = `# ${title}

**生成时间**: ${now.toLocaleString('zh-CN')}
**用户**: ${user?.nickname || '未知'}

---

## 一、工作概述

在${summaryType === 'weekly' ? '本周' : summaryType === 'monthly' ? '本月' : '本季度'}的工作中，共参与了 **${total}** 项任务，完成了 **${done}** 项，完成率为 **${completionRate}%**。

## 二、任务完成情况

| 状态 | 数量 | 占比 |
|------|------|------|
| 待办 | ${todo} | ${total > 0 ? Math.round((todo / total) * 100) : 0}% |
| 进行中 | ${inProgress} | ${total > 0 ? Math.round((inProgress / total) * 100) : 0}% |
| 已完成 | ${done} | ${total > 0 ? Math.round((done / total) * 100) : 0}% |
| **合计** | **${total}** | **100%** |

## 三、项目参与情况

${projectStatsWithName.length > 0 ? projectStatsWithName.map(p => `- **${p.projectName}**: ${p.count} 项任务`).join('\n') : '暂无项目数据'}

## 四、已完成任务

${doneTasks.length > 0 ? doneTasks.map(t => `- [x] ${t.title} (${t.project?.name || '未分类'})`).join('\n') : '暂无已完成任务'}

## 五、进行中任务

${inProgressTasks.length > 0 ? inProgressTasks.map(t => `- [ ] ${t.title} (${t.project?.name || '未分类'}) - 截止: ${new Date(t.dueDate).toLocaleDateString('zh-CN')}`).join('\n') : '暂无进行中任务'}

## 六、待办任务

${todoTasks.length > 0 ? todoTasks.map(t => `- [ ] ${t.title} (${t.project?.name || '未分类'}) - 截止: ${new Date(t.dueDate).toLocaleDateString('zh-CN')}`).join('\n') : '暂无待办任务'}

## 七、下一步计划

1. 优先处理临近截止日期的任务
2. 跟进进行中的任务进度
3. 合理安排待办任务的优先级

---

*本报告由中集智历系统自动生成*
`

    // 设置响应头（以Markdown格式输出，可用于后续转换为PDF）
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="work-summary-${new Date().toISOString().split('T')[0]}.md"`)
    res.setHeader('Content-Length', Buffer.byteLength(mdContent, 'utf-8'))

    res.send(mdContent)
  } catch (error) {
    console.error('导出PDF失败:', error)
    res.status(500).json({
      success: false,
      message: '导出PDF失败'
    })
  }
}

/**
 * 导出任务JSON数据
 * GET /api/export/json
 */
export async function exportJSON(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId!
    const { startDate, endDate, projectId, status } = req.query

    // 构建查询条件
    const whereClause: Record<string, unknown> = {
      OR: [
        { assigneeId: userId },
        { collaborators: { some: { userId } } }
      ],
      deletedAt: null
    }

    // 添加日期范围过滤
    if (startDate || endDate) {
      whereClause.dueDate = {}
      if (startDate) {
        (whereClause.dueDate as Record<string, unknown>).gte = new Date(startDate as string)
      }
      if (endDate) {
        (whereClause.dueDate as Record<string, unknown>).lte = new Date(endDate as string)
      }
    }

    // 添加项目过滤
    if (projectId) {
      whereClause.projectId = projectId as string
    }

    // 添加状态过滤
    if (status) {
      whereClause.status = status as string
    }

    // 获取任务列表
    const tasks = await prisma.task.findMany({
      where: whereClause,
      include: {
        project: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, color: true } },
        assignee: { select: { id: true, nickname: true, email: true } },
        creator: { select: { id: true, nickname: true } },
        collaborators: {
          include: {
            user: { select: { id: true, nickname: true } }
          }
        }
      },
      orderBy: { dueDate: 'asc' }
    })

    const exportData = {
      exportedAt: new Date().toISOString(),
      exportedBy: userId,
      total: tasks.length,
      tasks: tasks.map(task => ({
        id: task.id,
        title: task.title,
        description: task.description,
        project: task.project,
        category: task.category,
        status: task.status,
        priority: task.priority,
        assignee: task.assignee,
        creator: task.creator,
        collaborators: task.collaborators.map(c => c.user),
        startDate: task.startDate,
        dueDate: task.dueDate,
        deliverable: task.deliverable,
        tags: task.tags,
        reminder: task.reminder,
        repeat: task.repeat,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt
      }))
    }

    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="tasks-${new Date().toISOString().split('T')[0]}.json"`)

    res.json({
      success: true,
      data: exportData
    })
  } catch (error) {
    console.error('导出JSON失败:', error)
    res.status(500).json({
      success: false,
      message: '导出JSON失败'
    })
  }
}
