import { describe, it, expect } from 'vitest'
import { getIssueNumber, getDaysUntilThursday, getIssueInfo } from './issue-number'

// 所有断言均以 UTC+8 墙上时间为准。构造 Date 时用 Z（UTC）时刻，
// 再换算成 UTC+8：如 2024-01-04T00:00Z = 2024-01-04 08:00（UTC+8）。

describe('getIssueNumber', () => {
  it('创刊号当天为第 1 期', () => {
    expect(getIssueNumber(new Date('2024-01-04T04:00:00.000Z'))).toBe(1)
  })

  it('创刊号那一周（周四到下周三）均为第 1 期', () => {
    // 2024-01-10 是创刊后的周三，仍属第 1 期
    expect(getIssueNumber(new Date('2024-01-10T04:00:00.000Z'))).toBe(1)
  })

  it('下一个周四进位到第 2 期', () => {
    expect(getIssueNumber(new Date('2024-01-11T04:00:00.000Z'))).toBe(2)
  })

  it('再一周为第 3 期', () => {
    expect(getIssueNumber(new Date('2024-01-18T04:00:00.000Z'))).toBe(3)
  })

  it('跨年跨闰年累计正确（2026-07-09 为第 132 期）', () => {
    // 2024-01-04 → 2026-07-09 共 917 天（含 2024 闰年），917 / 7 = 131，+1 = 132
    expect(getIssueNumber(new Date('2026-07-09T04:00:00.000Z'))).toBe(132)
  })

  it('UTC+8 跨日边界：19:59Z 仍是当天，20:00Z 属次日', () => {
    // 2024-01-04T15:59Z = 01-04 23:59（UTC+8），仍第 1 期
    expect(getIssueNumber(new Date('2024-01-04T15:59:00.000Z'))).toBe(1)
    // 2024-01-10T16:00Z = 01-11 00:00（UTC+8），已跨到下个周四 → 第 2 期
    expect(getIssueNumber(new Date('2024-01-10T16:00:00.000Z'))).toBe(2)
  })
})

describe('getDaysUntilThursday', () => {
  it('周四当天为 0', () => {
    expect(getDaysUntilThursday(4)).toBe(0)
  })

  it('周五需再等 6 天', () => {
    expect(getDaysUntilThursday(5)).toBe(6)
  })

  it('周一需等 3 天', () => {
    expect(getDaysUntilThursday(1)).toBe(3)
  })

  it('周日需等 4 天', () => {
    expect(getDaysUntilThursday(0)).toBe(4)
  })
})

describe('getIssueInfo', () => {
  it('创刊号周四：完整字段', () => {
    const info = getIssueInfo(new Date('2024-01-04T04:00:00.000Z'))
    expect(info.issueNumber).toBe(1)
    expect(info.year).toBe(2024)
    expect(info.month).toBe(1)
    expect(info.day).toBe(4)
    expect(info.weekday).toBe(4)
    expect(info.weekdayLabel).toBe('星期四')
    expect(info.isThursday).toBe(true)
    expect(info.daysUntilThursday).toBe(0)
    expect(info.dateLine).toBe('第 1 期 · 2024 年 1 月 4 日 · 星期四')
    expect(info.countdownLabel).toBe('今天就是疯狂星期四')
  })

  it('非周四：给出倒计时文案', () => {
    // 2024-01-05T04:00Z = 01-05 12:00（UTC+8），周五
    const info = getIssueInfo(new Date('2024-01-05T04:00:00.000Z'))
    expect(info.weekday).toBe(5)
    expect(info.weekdayLabel).toBe('星期五')
    expect(info.isThursday).toBe(false)
    expect(info.daysUntilThursday).toBe(6)
    expect(info.issueNumber).toBe(1)
    expect(info.dateLine).toBe('第 1 期 · 2024 年 1 月 5 日 · 星期五')
    expect(info.countdownLabel).toBe('距下个疯狂星期四还有 6 天')
  })

  it('UTC+8 跨日：15:59Z 与 16:00Z 分属两个自然日', () => {
    const before = getIssueInfo(new Date('2024-01-04T15:59:00.000Z'))
    expect(before.day).toBe(4)
    expect(before.weekdayLabel).toBe('星期四')

    const after = getIssueInfo(new Date('2024-01-04T16:00:00.000Z'))
    expect(after.day).toBe(5)
    expect(after.weekdayLabel).toBe('星期五')
  })
})
