/**
 * 中集智历 - 农历工具函数
 * 使用 lunar-javascript 库实现农历、节气、节假日功能
 */
import { Solar } from 'lunar-javascript'

export interface LunarInfo {
  lunarDay: string        // 农历日期，如"初一"
  lunarMonth: string      // 农历月份，如"正月"
  lunarYear: string       // 农历年份干支，如"丙午年"
  solarTerm: string       // 节气，如"惊蛰"
  chineseHoliday: string  // 中国传统节日
  internationalHoliday: string // 国际节日
  isHoliday: boolean      // 是否法定节假日
  isWeekend: boolean      // 是否周末
}

/**
 * 中国法定节假日列表（2026年）
 */
const PUBLIC_HOLIDAYS_2026: Record<string, string> = {
  // 元旦
  '01-01': '元旦',
  '01-02': '元旦',
  '01-03': '元旦',
  // 春节 (2026年春节是2月17日)
  '02-16': '春节',
  '02-17': '春节',
  '02-18': '春节',
  '02-19': '春节',
  '02-20': '春节',
  '02-21': '春节',
  '02-22': '春节',
  // 清明节
  '04-04': '清明节',
  '04-05': '清明节',
  '04-06': '清明节',
  // 劳动节
  '05-01': '劳动节',
  '05-02': '劳动节',
  '05-03': '劳动节',
  '05-04': '劳动节',
  '05-05': '劳动节',
  // 端午节 (2026年端午节是5月31日)
  '05-31': '端午节',
  '06-01': '端午节',
  '06-02': '端午节',
  // 中秋节+国庆节 (2026年中秋节是9月25日)
  '10-01': '国庆节',
  '10-02': '国庆节',
  '10-03': '国庆节',
  '10-04': '国庆节',
  '10-05': '国庆节',
  '10-06': '国庆节',
  '10-07': '国庆节',
  '10-08': '国庆节',
}

/**
 * 获取指定日期的农历信息
 */
export function getLunarInfo(date: Date): LunarInfo {
  const solar = Solar.fromDate(date)
  const lunar = solar.getLunar()

  // 获取节气
  const solarTerm = lunar.getJieQi() || ''

  // 获取农历日期字符串
  const lunarDay = lunar.getDayInChinese()
  const lunarMonth = lunar.getMonthInChinese()

  // 获取节日
  const chineseHolidays: string[] = []
  const internationalHolidays: string[] = []

  // 农历节日
  const lunarFestivals = lunar.getFestivals()
  if (lunarFestivals.length > 0) {
    chineseHolidays.push(...lunarFestivals)
  }

  // 公历节日
  const solarFestivals = solar.getFestivals()
  if (solarFestivals.length > 0) {
    internationalHolidays.push(...solarFestivals)
  }

  // 判断是否是法定节假日
  const isHoliday = isPublicHoliday(date)

  return {
    lunarDay,
    lunarMonth,
    lunarYear: lunar.getYearInGanZhi() + '年',
    solarTerm,
    chineseHoliday: chineseHolidays[0] || '',
    internationalHoliday: internationalHolidays[0] || '',
    isHoliday,
    isWeekend: date.getDay() === 0 || date.getDay() === 6
  }
}

/**
 * 判断是否是法定节假日
 */
export function isPublicHoliday(date: Date): boolean {
  const key = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  return key in PUBLIC_HOLIDAYS_2026
}

/**
 * 获取节假日名称
 */
export function getHolidayName(date: Date): string {
  const key = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  return PUBLIC_HOLIDAYS_2026[key] || ''
}

/**
 * 格式化农历显示
 * 优先级：节日 > 节气 > 月份（初一） > 农历日期
 */
export function formatLunarDisplay(lunarInfo: LunarInfo): string {
  // 如果有中国节日，优先显示
  if (lunarInfo.chineseHoliday) {
    return lunarInfo.chineseHoliday
  }
  // 如果有国际节日
  if (lunarInfo.internationalHoliday) {
    return lunarInfo.internationalHoliday
  }
  // 如果有节气，显示节气
  if (lunarInfo.solarTerm) {
    return lunarInfo.solarTerm
  }
  // 初一显示月份
  if (lunarInfo.lunarDay === '初一') {
    return lunarInfo.lunarMonth
  }
  // 其他显示农历日期
  return lunarInfo.lunarDay
}

/**
 * 获取节日的类型（用于样式）
 */
export function getHolidayType(lunarInfo: LunarInfo): 'chinese' | 'international' | 'solar-term' | 'holiday' | 'none' {
  if (lunarInfo.isHoliday) return 'holiday'
  if (lunarInfo.chineseHoliday) return 'chinese'
  if (lunarInfo.internationalHoliday) return 'international'
  if (lunarInfo.solarTerm) return 'solar-term'
  return 'none'
}
