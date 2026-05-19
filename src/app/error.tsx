'use client'

import Link from 'next/link'

// 路由级错误边界：数据库不可用（Neon 免费额度耗尽被 paused 等）时，
// 服务端组件取数抛错会落到这里，给一个有疯四味的友好提示而非默认报错页。
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="bg-kfc-cream relative isolate flex flex-1 flex-col items-center justify-center overflow-hidden p-4 text-center">
      <div className="shadow-neo-xl relative z-10 max-w-2xl border-4 border-black bg-white px-6 py-12">
        <p className="font-display text-kfc-red text-7xl font-black italic drop-shadow-[4px_4px_0_#000]">
          🍗 打烊中
        </p>

        <h1 className="font-display mt-4 text-3xl font-black text-black italic md:text-4xl">
          服务器正在小憩
        </h1>

        <p className="mt-4 text-xl font-bold text-gray-800">
          疯四的服务器吃太饱睡着了，文案稍后回来。
        </p>

        <div className="shadow-neo mt-8 rotate-1 transform border-3 border-black bg-kfc-yellow p-6 transition-transform hover:rotate-0">
          <div className="mb-3 flex items-center justify-center gap-3">
            <span className="text-2xl">😴</span>
            <span className="text-lg font-black text-black uppercase">
              稍等片刻 / Be Right Back
            </span>
            <span className="text-2xl">😴</span>
          </div>
          <p className="text-base font-bold text-black italic">
            “要不先 V 我 50 醒醒神？回头一定加倍把文案端上来。”
          </p>
        </div>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
          <button
            onClick={reset}
            className="shadow-neo border-3 bg-kfc-red border-black px-6 py-3 font-black text-white uppercase transition-transform hover:-translate-y-0.5"
          >
            <i className="fa fa-refresh mr-2" /> 再试一次 / Retry
          </button>

          <Link
            href="/"
            className="shadow-neo border-3 border-black bg-white px-6 py-3 font-black text-black uppercase transition-transform hover:-translate-y-0.5"
          >
            <i className="fa fa-home mr-2" /> 回首页 / Home
          </Link>
        </div>

        <div className="mt-8 text-xs font-bold text-gray-500 uppercase">
          <p>💡 服务很快恢复，文案鬼才们别走开</p>
        </div>
      </div>
    </div>
  )
}
