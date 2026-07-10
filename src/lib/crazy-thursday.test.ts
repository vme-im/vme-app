import { describe, it, expect } from 'vitest'
import { getDaysUntilThursday, getThursdayInfo } from './crazy-thursday'

// 所有断言均以 UTC+8 墙上时间为准。构造 Date 时用 Z（UTC）时刻，
// 再换算成 UTC+8：如 2024-01-04T00:00Z = 2024-01-04 08:00（UTC+8）。

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

describe('getThursdayInfo', () => {
  it('周四当天：完整字段', () => {
    // 2024-01-04T04:00Z = 01-04 12:00（UTC+8），周四
    const info = getThursdayInfo(new Date('2024-01-04T04:00:00.000Z'))
    expect(info.weekday).toBe(4)
    expect(info.isThursday).toBe(true)
    expect(info.daysUntilThursday).toBe(0)
    expect(info.countdownLabel).toBe('今天就是疯狂星期四')
  })

  it('非周四：给出倒计时文案', () => {
    // 2024-01-05T04:00Z = 01-05 12:00（UTC+8），周五
    const info = getThursdayInfo(new Date('2024-01-05T04:00:00.000Z'))
    expect(info.weekday).toBe(5)
    expect(info.isThursday).toBe(false)
    expect(info.daysUntilThursday).toBe(6)
    expect(info.countdownLabel).toBe('距下个疯狂星期四还有 6 天')
  })

  it('UTC+8 跨日：15:59Z 与 16:00Z 分属两个自然日', () => {
    // 2024-01-04T15:59Z = 01-04 23:59（UTC+8），仍是周四
    const before = getThursdayInfo(new Date('2024-01-04T15:59:00.000Z'))
    expect(before.weekday).toBe(4)
    expect(before.isThursday).toBe(true)

    // 2024-01-04T16:00Z = 01-05 00:00（UTC+8），已是周五
    const after = getThursdayInfo(new Date('2024-01-04T16:00:00.000Z'))
    expect(after.weekday).toBe(5)
    expect(after.isThursday).toBe(false)
    expect(after.daysUntilThursday).toBe(6)
  })
})
