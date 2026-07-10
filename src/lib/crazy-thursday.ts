// 疯狂星期四倒计时：按中国时区（UTC+8）计算距下个周四的天数与倒计时文案。
// 纯函数、无副作用，便于单测；页面在 ISR（revalidate 3600）下调用，时效足够。

const UTC8_OFFSET_MS = 8 * 60 * 60 * 1000

/** 疯狂星期四 = 一周的第 4 天（0=周日） */
const THURSDAY_INDEX = 4

export interface ThursdayInfo {
  /** 星期几：0=周日 … 6=周六（UTC+8） */
  weekday: number
  /** 距下个疯狂星期四的天数，0 表示今天就是周四 */
  daysUntilThursday: number
  /** 今天是否为疯狂星期四 */
  isThursday: boolean
  /** 倒计时串：「距下个疯狂星期四还有 d 天」或「今天就是疯狂星期四」 */
  countdownLabel: string
}

/** 把任意时刻平移到 UTC+8 墙上时间对应的 UTC Date，便于用 getUTC* 读取分量 */
function toUtc8(date: Date): Date {
  return new Date(date.getTime() + UTC8_OFFSET_MS)
}

/**
 * 计算距下个疯狂星期四的天数（0 表示今天就是周四）。
 * @param weekday 0=周日 … 6=周六
 */
export function getDaysUntilThursday(weekday: number): number {
  return (THURSDAY_INDEX - weekday + 7) % 7
}

/** 汇总一份用于 Header 倒计时的信息 */
export function getThursdayInfo(now: Date = new Date()): ThursdayInfo {
  const weekday = toUtc8(now).getUTCDay()
  const daysUntilThursday = getDaysUntilThursday(weekday)
  const isThursday = daysUntilThursday === 0

  const countdownLabel = isThursday
    ? '今天就是疯狂星期四'
    : `距下个疯狂星期四还有 ${daysUntilThursday} 天`

  return { weekday, daysUntilThursday, isThursday, countdownLabel }
}
