import NeoButton from '@/components/shared/NeoButton'

export default function NotFound() {
  return (
    <div className="bg-kfc-cream relative isolate flex flex-1 flex-col items-center justify-center overflow-hidden p-4 text-center">
      {/* 404 内容：报纸「更正启事」的口吻 */}
      <div className="shadow-neo-xl relative z-10 max-w-2xl border-4 border-black bg-white px-6 py-12">
        <div className="text-kfc-red text-xs font-black tracking-wide">更正启事 · 版面遗失</div>

        {/* 404 数字（font-display 数字装饰，允许 italic） */}
        <p className="font-display text-kfc-red mt-2 text-8xl font-black italic drop-shadow-[4px_4px_0_#000]">
          404
        </p>

        {/* 主标题 */}
        <h1 className="mt-4 text-3xl font-black tracking-tight text-black md:text-4xl">
          本版面不存在
        </h1>

        {/* 副标题 */}
        <p className="text-news-gray mt-4 text-lg font-bold">
          可能被撤稿了，也可能压根没排进这期。
        </p>

        {/* 贴纸标签 + 引言（头版级装饰） */}
        <div className="mt-8">
          <span className="bg-kfc-yellow shadow-neo-sm inline-block rotate-1 border-2 border-black px-3 py-1 text-sm font-black text-black">
            本报注
          </span>
          <p className="font-serif-news mx-auto mt-4 max-w-md text-base text-black">
            “这条新闻多半是揣着你的 50 块，蹲肯德基去了。”
          </p>
        </div>

        {/* 操作按钮 */}
        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
          <NeoButton href="/" variant="primary" icon="home">
            回到头版
          </NeoButton>

          <NeoButton href="/submit" variant="secondary" icon="pencil">
            上交新文案
          </NeoButton>
        </div>

        {/* 底部提示 */}
        <p className="text-news-gray mt-8 text-xs font-bold">找不到的版面，就自己写一版。</p>
      </div>
    </div>
  )
}
