/**
 * 中集智历 - 日期处理工具函数
 */
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import relativeTime from 'dayjs/plugin/relativeTime'

// 配置dayjs
dayjs.locale('zh-cn')
dayjs.extend(relativeTime)

/**
 * 格式化日期
 */
export function formatDate(date: string | Date, format = 'YYYY-MM-DD'): string {
  return dayjs(date).format(format)
}

/**
 * 格式化日期时间
 */
export function formatDateTime(date: string | Date, format = 'YYYY-MM-DD HH:mm'): string {
  return dayjs(date).format(format)
}

/**
 * 获取相对时间
 */
export function getRelativeTime(date: string | Date): string {
  return dayjs(date).fromNow()
}

/**
 * 判断是否是今天
 */
export function isToday(date: string | Date): boolean {
  return dayjs(date).isSame(dayjs(), 'day')
}

/**
 * 判断是否是本周
 */
export function isThisWeek(date: string | Date): boolean {
  return dayjs(date).isSame(dayjs(), 'week')
}

/**
 * 判断是否是本月
 */
export function isThisMonth(date: string | Date): boolean {
  return dayjs(date).isSame(dayjs(), 'month')
}

/**
 * 获取月份的天数
 */
export function getDaysInMonth(year: number, month: number): number {
  return dayjs(`${year}-${month}`).daysInMonth()
}

/**
 * 获取月份第一天是星期几 (0-6, 0表示周日)
 */
export function getFirstDayOfMonth(year: number, month: number): number {
  return dayjs(`${year}-${month}-01`).day()
}

/**
 * 获取日历月份的所有日期
 */
export function getCalendarDays(year: number, month: number): Date[] {
  const days: Date[] = []
  const firstDay = getFirstDayOfMonth(year, month)
  const daysInMonth = getDaysInMonth(year, month)

  // 上个月的日期
  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear = month === 1 ? year - 1 : year
  const prevDaysInMonth = getDaysInMonth(prevYear, prevMonth)

  for (let i = firstDay - 1; i >= 0; i--) {
    days.push(new Date(prevYear, prevMonth - 1, prevDaysInMonth - i))
  }

  // 当月日期
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(year, month - 1, i))
  }

  // 下个月的日期
  const remainingDays = 42 - days.length // 6行 x 7天 = 42
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year

  for (let i = 1; i <= remainingDays; i++) {
    days.push(new Date(nextYear, nextMonth - 1, i))
  }

  return days
}

/**
 * 判断两个日期是否是同一天
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return dayjs(date1).isSame(dayjs(date2), 'day')
}

/**
 * 获取星期几的中文名称
 */
export function getWeekDayName(date: Date | string): string {
  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return days[dayjs(date).day()]
}

export { dayjs }
