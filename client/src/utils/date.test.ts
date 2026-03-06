/**
 * 日期处理工具函数测试
 */
import { describe, it, expect } from 'vitest'
import {
  formatDate,
  formatDateTime,
  getRelativeTime,
  isToday,
  isThisWeek,
  isThisMonth,
  getDaysInMonth,
  getFirstDayOfMonth,
  getCalendarDays,
  isSameDay,
  getWeekDayName
} from './date'

describe('date utils', () => {
  describe('formatDate', () => {
    it('应该使用默认格式格式化日期', () => {
      const date = new Date('2024-03-15')
      expect(formatDate(date)).toBe('2024-03-15')
    })

    it('应该支持自定义格式', () => {
      const date = new Date('2024-03-15')
      expect(formatDate(date, 'YYYY/MM/DD')).toBe('2024/03/15')
    })

    it('应该支持字符串日期输入', () => {
      expect(formatDate('2024-03-15')).toBe('2024-03-15')
    })
  })

  describe('formatDateTime', () => {
    it('应该使用默认格式格式化日期时间', () => {
      const date = new Date('2024-03-15T14:30:00')
      expect(formatDateTime(date)).toBe('2024-03-15 14:30')
    })

    it('应该支持自定义格式', () => {
      const date = new Date('2024-03-15T14:30:00')
      expect(formatDateTime(date, 'YYYY-MM-DD HH:mm:ss')).toBe('2024-03-15 14:30:00')
    })
  })

  describe('getRelativeTime', () => {
    it('应该返回相对时间描述', () => {
      const now = new Date()
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
      const result = getRelativeTime(oneHourAgo)
      // 中文相对时间，可能是 "1 小时前" 或类似
      expect(result).toContain('小时')
    })
  })

  describe('isToday', () => {
    it('今天应该返回 true', () => {
      expect(isToday(new Date())).toBe(true)
    })

    it('昨天应该返回 false', () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      expect(isToday(yesterday)).toBe(false)
    })
  })

  describe('isThisWeek', () => {
    it('本周的日期应该返回 true', () => {
      expect(isThisWeek(new Date())).toBe(true)
    })
  })

  describe('isThisMonth', () => {
    it('本月的日期应该返回 true', () => {
      expect(isThisMonth(new Date())).toBe(true)
    })

    it('上个月的日期应该返回 false', () => {
      const lastMonth = new Date()
      lastMonth.setMonth(lastMonth.getMonth() - 1)
      expect(isThisMonth(lastMonth)).toBe(false)
    })
  })

  describe('getDaysInMonth', () => {
    it('应该返回月份的天数', () => {
      expect(getDaysInMonth(2024, 1)).toBe(31)  // 1月
      expect(getDaysInMonth(2024, 2)).toBe(29)  // 2月（闰年）
      expect(getDaysInMonth(2023, 2)).toBe(28)  // 2月（平年）
      expect(getDaysInMonth(2024, 4)).toBe(30)  // 4月
    })
  })

  describe('getFirstDayOfMonth', () => {
    it('应该返回月份第一天是星期几', () => {
      // 2024年3月1日是周五 (5)
      expect(getFirstDayOfMonth(2024, 3)).toBe(5)
      // 2024年1月1日是周一 (1)
      expect(getFirstDayOfMonth(2024, 1)).toBe(1)
    })
  })

  describe('getCalendarDays', () => {
    it('应该返回42天的日历日期数组', () => {
      const days = getCalendarDays(2024, 3)
      expect(days.length).toBe(42)
    })

    it('应该包含当月所有日期', () => {
      const days = getCalendarDays(2024, 3)
      const marchDays = days.filter(d => d.getMonth() === 2) // 月份是0-indexed
      expect(marchDays.length).toBe(31)
    })
  })

  describe('isSameDay', () => {
    it('相同日期应该返回 true', () => {
      const date1 = new Date('2024-03-15T10:00:00')
      const date2 = new Date('2024-03-15T15:00:00')
      expect(isSameDay(date1, date2)).toBe(true)
    })

    it('不同日期应该返回 false', () => {
      const date1 = new Date('2024-03-15')
      const date2 = new Date('2024-03-16')
      expect(isSameDay(date1, date2)).toBe(false)
    })
  })

  describe('getWeekDayName', () => {
    it('应该返回正确的星期名称', () => {
      // 2024-03-15 是周五
      expect(getWeekDayName(new Date('2024-03-15'))).toBe('周五')
      // 2024-03-17 是周日
      expect(getWeekDayName(new Date('2024-03-17'))).toBe('周日')
      // 2024-03-18 是周一
      expect(getWeekDayName(new Date('2024-03-18'))).toBe('周一')
    })

    it('应该支持字符串输入', () => {
      expect(getWeekDayName('2024-03-15')).toBe('周五')
    })
  })
})
