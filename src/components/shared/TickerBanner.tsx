const TICKER_ITEMS = [
  '🍗 疯狂星期四，V 我 50',
  '✦ 今天的鸡腿我请',
  '🔥 原辣鸡块套餐',
  '✦ 不疯狂不星期四',
  '⚡️ KFC CRAZY THURSDAY',
  '✦ 疯狂文案征集中',
  '💥 别藏着，把你的好活交出来',
  '✦ 每周四见',
  '🎉 V ME 50',
  '✦ 疯狂大赏进行时',
]

export default function TickerBanner() {
  const text = TICKER_ITEMS.join('   ')
  // 双份内容保证无缝循环
  const doubled = `${text}   ${text}`

  return (
    <div className="overflow-hidden border-b-4 border-black bg-kfc-yellow py-1.5 select-none">
      <div className="animate-marquee whitespace-nowrap font-black text-sm uppercase tracking-widest text-black">
        {doubled}
      </div>
    </div>
  )
}
