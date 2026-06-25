/**
 * 中集智历 - 年度仪表盘服务
 *
 * 计算某个自然年的任务统计(自然年口径 = 1/1 ~ 12/31)
 * - 任务「我参与/可见」= assigneeId=me OR 协作人包含 me
 * - yearlyTotal = 全年所有任务(去重 deletedAt, 不分状态)
 * - yearlyTodo = 全年待办 (status 不在 DONE / CANCELLED)
 * - yearlyOverdue = 全年逾期 (dueDate < now 且 status != DONE)
 * - yearlyDone = 全年已完成
 * - byMonth = 按 dueDate 落月聚合的 12 个月分布 (注意:按「截止月」统计,与 plan §3 风险登记一致)
 */
import prisma from '../config/database.js'

const YEARLY_TOTAL_CAP = 10000

export interface YearlyDashboard {
  year: number
  yearlyTotal: number
  yearlyTodo: number
  yearlyOverdue: number
  yearlyDone: number
  byMonth: Array<{ month: number; total: number; done: number }>
  truncated: boolean // yearlyTotal 命中上限时为 true
}

/**
 * 计算 [year-01-01 00:00:00, year+1-01-01 00:00:00) 区间
 */
function getYearRange(year: number): { start: Date; end: Date } {
  const start = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0))
  const end = new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0, 0))
  return { start, end }
}

/**
 * 主入口:拿某年某用户的年度看板数据
 */
export async function getYearlyDashboard(
  userId: string,
  year: number
): Promise<YearlyDashboard> {
  // 1. 校验年份
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error(`year 越界: ${year} (合法范围 2000..2100)`)
  }
  const { start, end } = getYearRange(year)

  // 2. 拿「我在范围内」的任务 dueDate + status(只取用得到的列,降 IO)
  // 注: deletedAt: null 是软删过滤,跟现有 dashboard 保持一致
  // 注: visibility 暂时不过滤(参考 §3 计划要求「我参与/可见」,这里先按参与过滤;
  //     若后续要卡可见性,加 project.visibility = PUBLIC 即可,目前 production 数据
  //     项目都是 PUBLIC 不会受影响)
  const tasks = await prisma.task.findMany({
    where: {
      OR: [
        { assigneeId: userId },
        { collaborators: { some: { userId } } }
      ],
      dueDate: { gte: start, lt: end },
      deletedAt: null
    },
    select: {
      status: true,
      dueDate: true
    },
    // 上限:避免单用户单年 >10k 任务把内存打爆(plan §3 风险登记)
    take: YEARLY_TOTAL_CAP
  })

  const truncated = tasks.length >= YEARLY_TOTAL_CAP

  const now = new Date()
  // 3. 内存聚合
  let yearlyTodo = 0
  let yearlyOverdue = 0
  let yearlyDone = 0

  // 12 个月桶
  const monthBuckets: Array<{ total: number; done: number }> = Array.from(
    { length: 12 },
    () => ({ total: 0, done: 0 })
  )

  for (const t of tasks) {
    const isDone = t.status === 'DONE'
    const isCancelled = t.status === 'CANCELLED'
    const isOverdue = !isDone && t.dueDate < now

    if (isDone) yearlyDone++
    else if (!isCancelled) {
      // 计入 todo(包含 overdue)
      yearlyTodo++
      if (isOverdue) yearlyOverdue++
    }

    // 月份桶(按 UTC 月份,避免时区漂移)
    const monthIdx = t.dueDate.getUTCMonth() // 0..11
    if (monthIdx >= 0 && monthIdx < 12) {
      monthBuckets[monthIdx].total++
      if (isDone) monthBuckets[monthIdx].done++
    }
  }

  return {
    year,
    yearlyTotal: tasks.length,
    yearlyTodo,
    yearlyOverdue,
    yearlyDone,
    byMonth: monthBuckets.map((b, i) => ({
      month: i + 1,
      total: b.total,
      done: b.done
    })),
    truncated
  }
}
