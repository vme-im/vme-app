// 号外条：站头下方一条克制的跑马灯（原版就有的梗文化，保留）——
// 薄条、慢速、无食物 emoji，只留 ✦ 作分隔。动画响应 prefers-reduced-motion。
const TICKER_ITEMS = [
  '不疯狂不星期四',
  'V ME 50',
  '精神状态遥遥领先',
  '一周只疯一天',
  '文案全是网友自己写的',
  '今天你 V50 了吗',
  '疯四文学，代代相传',
]

export default function TickerBanner() {
  const text = TICKER_ITEMS.join('　✦　')
  // 双份内容保证无缝循环
  const doubled = `${text}　✦　${text}　✦　`

  return (
    <div className="bg-kfc-yellow overflow-hidden border-b-4 border-black py-1 select-none">
      <div className="animate-marquee-slow text-kfc-black text-xs font-bold tracking-wide whitespace-nowrap">
        {doubled}
      </div>
    </div>
  )
}
