declare module 'lunar-javascript' {
  export class Solar {
    static fromDate(date: Date): Solar
    getLunar(): Lunar
    getFestivals(): string[]
  }

  export class Lunar {
    getDayInChinese(): string
    getMonthInChinese(): string
    getYearInGanZhi(): string
    getJieQi(): string
    getFestivals(): string[]
  }
}
