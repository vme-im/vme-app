import Link from 'next/link'
import NeoButton from '@/components/shared/NeoButton'

export default function NotFound() {
  return (
    <div className="relative isolate flex flex-1 flex-col items-center justify-center overflow-hidden bg-kfc-cream text-center p-4">
      {/* 404 错误内容 */}
      <div className="relative z-10 max-w-2xl px-6 py-12 border-4 border-black bg-white shadow-neo-xl">
        {/* 404 数字 */}
        <p className="font-display text-8xl font-black italic text-kfc-red drop-shadow-[4px_4px_0_#000]">
          404
        </p>

        {/* 主标题 */}
        <h1 className="mt-4 font-display text-3xl font-black italic text-black md:text-4xl">
          哎呀，迷路了？
        </h1>

        {/* 副标题 */}
        <p className="mt-4 text-xl font-bold text-gray-800">
          没有这个页面，要不下星期四再来看看？
        </p>

        {/* 幽默提示 */}
        <div className="mt-8 border-3 border-black bg-kfc-yellow p-6 shadow-neo transform rotate-1 transition-transform hover:rotate-0">
          <div className="flex items-center justify-center gap-3 mb-3">
            <span className="text-2xl">🍗</span>
            <span className="text-black font-black uppercase text-lg">Daily Humor / 今日份幽默</span>
            <span className="text-2xl">🍗</span>
          </div>
          <p className="text-base text-black font-bold italic">
            “404错误就像疯狂星期四的优惠券，有时候就是找不到，但别担心，还有更多段子等着你！”
          </p>
        </div>

        {/* 操作按钮 */}
        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
          <NeoButton href="/" variant="primary" icon="fa-home">
            BACK HOME / 回到首页
          </NeoButton>

          <NeoButton
            href="https://github.com/zkl2333/vme/issues/new?assignees=&labels=%E6%96%87%E6%A1%88&projects=&template=data_provided.md&title="
            variant="secondary"
            icon="fa-pencil"
            external
          >
            CONTRIBUTE / 写个新段子
          </NeoButton>
        </div>

        {/* 底部提示 */}
        <div className="mt-8 text-xs font-bold text-gray-500 uppercase">
          <p>💡 Lost? Create your own legacy here.</p>
        </div>
      </div>
    </div>
  )
}
