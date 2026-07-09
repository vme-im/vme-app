// 期数工具：按中国时区（UTC+8）计算《疯狂星期四日报》的期数与日期栏文案。
// 纯函数、无副作用，便于单测；页面在 ISR（revalidate 3600）下调用，时效足够。

/** 创刊号：2024-01-04（2024 年的第一个周四），以 UTC+8 墙上时间锚定 */
const FOUNDING_UTC8_MS = Date.UTC(2024, 0, 4) // 2024-01-04 00:00（UTC+8 民用日锚点）
const DAY_MS = 86_400_000
const UTC8_OFFSET_MS = 8 * 60 * 60 * 1000

/** 中文星期，索引 0=周日 … 6=周六 */
const WEEKDAY_CN = ['日', '一', '二', '三', '四', '五', '六'] as const

/** 疯狂星期四 = 一周的第 4 天（0=周日） */
const THURSDAY_INDEX = 4

export interface IssueInfo {
  /** 期数，创刊号为第 1 期 */
  issueNumber: number
  /** 年（UTC+8） */
  year: number
  /** 月，1-12（UTC+8） */
  month: number
  /** 日（UTC+8） */
  day: number
  /** 星期几：0=周日 … 6=周六（UTC+8） */
  weekday: number
  /** 中文星期，如「星期四」 */
  weekdayLabel: string
  /** 距下个疯狂星期四的天数，0 表示今天就是周四 */
  daysUntilThursday: number
  /** 今天是否为疯狂星期四 */
  isThursday: boolean
  /** 日期栏主串：「第 N 期 · YYYY 年 M 月 D 日 · 星期X」 */
  dateLine: string
  /** 倒计时串：「距下个疯狂星期四还有 d 天」或「今天就是疯狂星期四」 */
  countdownLabel: string
}

/** 把任意时刻平移到 UTC+8 墙上时间对应的 UTC Date，便于用 getUTC* 读取分量 */
function toUtc8(date: Date): Date {
  return new Date(date.getTime() + UTC8_OFFSET_MS)
}

/** 该时刻对应的 UTC+8 民用日序号（自 epoch 起的整天数） */
function civilDayIndex(date: Date): number {
  return Math.floor((date.getTime() + UTC8_OFFSET_MS) / DAY_MS)
}

/**
 * 计算期数：当前日期距创刊号过了多少个完整周（每周四进一期）+ 1。
 * 因创刊号本身是周四，按 7 天取整即对齐到每个周四。
 */
export function getIssueNumber(now: Date = new Date()): number {
  const diffDays = civilDayIndex(now) - FOUNDING_UTC8_MS / DAY_MS
  return Math.floor(diffDays / 7) + 1
}

/**
 * 计算距下个疯狂星期四的天数（0 表示今天就是周四）。
 * @param weekday 0=周日 … 6=周六
 */
export function getDaysUntilThursday(weekday: number): number {
  return (THURSDAY_INDEX - weekday + 7) % 7
}

/** 汇总一份用于报头日期栏的期数信息 */
export function getIssueInfo(now: Date = new Date()): IssueInfo {
  const shifted = toUtc8(now)
  const year = shifted.getUTCFullYear()
  const month = shifted.getUTCMonth() + 1
  const day = shifted.getUTCDate()
  const weekday = shifted.getUTCDay()

  const issueNumber = getIssueNumber(now)
  const daysUntilThursday = getDaysUntilThursday(weekday)
  const isThursday = daysUntilThursday === 0
  const weekdayLabel = `星期${WEEKDAY_CN[weekday]}`

  const dateLine = `第 ${issueNumber} 期 · ${year} 年 ${month} 月 ${day} 日 · ${weekdayLabel}`
  const countdownLabel = isThursday
    ? '今天就是疯狂星期四'
    : `距下个疯狂星期四还有 ${daysUntilThursday} 天`

  return {
    issueNumber,
    year,
    month,
    day,
    weekday,
    weekdayLabel,
    daysUntilThursday,
    isThursday,
    dateLine,
    countdownLabel,
  }
}
