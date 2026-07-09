// 号外条：报头下方一条克制的跑马灯，保留报纸「号外」的性格但降噪——
// 变薄、放慢、去食物 emoji，只留印刷体的 ✦ 作分隔。动画响应 prefers-reduced-motion。
const TICKER_ITEMS = [
  '不疯狂不星期四',
  'V ME 50',
  '精神状态遥遥领先',
  '一周只疯一天',
  '网友自己写的',
  '本报文案全靠投喂',
  '逢周四出刊，风雨无阻',
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
