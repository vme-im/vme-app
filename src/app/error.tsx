'use client'

import Link from 'next/link'
import Icon from '@/components/shared/Icon'

// 路由级错误边界：远端快照不可用（raw.githubusercontent 抖动 / vme-content 临时 404 等）时，
// 服务端组件取数抛错会落到这里，给一个有疯四味的友好提示而非默认报错页。
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="bg-kfc-cream relative isolate flex flex-1 flex-col items-center justify-center overflow-hidden p-4 text-center">
      <div className="shadow-neo-xl relative z-10 max-w-2xl border-4 border-black bg-white px-6 py-12">
        <div className="text-kfc-red text-xs font-black tracking-wide">事故现场</div>

        {/* 主标题 */}
        <h1 className="mt-2 text-3xl font-black tracking-tight text-black md:text-5xl">
          服务器先疯为敬
        </h1>

        <p className="text-news-gray mt-4 text-lg font-bold">
          疯四的服务器吃太饱睡着了，文案稍后回来。
        </p>

        {/* 贴纸标签 + 引言（最响元素） */}
        <div className="mt-8">
          <span className="bg-kfc-yellow shadow-neo-sm inline-block -rotate-1 border-2 border-black px-3 py-1 text-sm font-black text-black">
            服务器的话
          </span>
          <p className="mx-auto mt-4 max-w-md text-base font-bold text-black">
            “要不先 V 我 50 醒醒神？回头一定加倍把文案端上来。”
          </p>
        </div>

        {/* 操作按钮 */}
        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
          <button
            onClick={reset}
            className="bg-kfc-red shadow-neo hover:shadow-neo-lg inline-flex items-center justify-center gap-2 border-3 border-black px-6 py-3 font-black text-white transition-all hover:-translate-x-0.5 hover:-translate-y-0.5"
          >
            <Icon name="refresh" /> 再试一次
          </button>

          <Link
            href="/"
            className="shadow-neo hover:shadow-neo-lg inline-flex items-center justify-center gap-2 border-3 border-black bg-white px-6 py-3 font-black text-black transition-all hover:-translate-x-0.5 hover:-translate-y-0.5"
          >
            <Icon name="home" /> 回到首页
          </Link>
        </div>

        <p className="text-news-gray mt-8 text-xs font-bold">服务很快恢复，文案鬼才们别走开。</p>
      </div>
    </div>
  )
}
