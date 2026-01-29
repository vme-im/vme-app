import Image from 'next/image'
import Link from 'next/link'
import NeoButton from '@/components/shared/NeoButton'

import { getKfcItemsWithPagination, getRandomKfcItem } from '@/lib/server-utils'

export default async function Page() {
  // 获取最新的一批段子用于展示
  // 我们获取前20个，然后从中选择展示
  const { items: latestItems } = await getKfcItemsWithPagination(1, 20)

  // 处理主推段子 (Headline)
  // 总是随机展示一个，保持惊喜感
  const headlineJoke = await getRandomKfcItem()

  // 选出3个"今日精选"，排除headline
  const selectedJokes = latestItems
    .filter(item => item.id !== headlineJoke?.id)
    .slice(0, 3)

  // 英雄榜文案轮换配置
  const HERO_COPIES = [
    { line1: '今天不疯狂星期四', line2: '你将失去一切' },
    { line1: '别问这周四疯不疯', line2: '直接 V 我 50' },
    { line1: '世界上最遥远的距离', line2: '是你读完段子 却没V我50' },
    { line1: '注意看，这个男人叫小帅', line2: '他想请你 V 他 50' },
    { line1: '如果今天不疯狂', line2: '那人生还有什么意义？' },
    { line1: 'V me 50', line2: 'Manners Maketh Man' },
  ]

  // 随机选择一个文案
  // 注意：在服务端组件中，这会在每次渲染（或重验证）时改变
  const randomCopy = HERO_COPIES[Math.floor(Math.random() * HERO_COPIES.length)]

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      {/* 1. Hero / 顶部横幅 */}
      <div className="relative mb-12 border-b-4 border-black pb-12 text-center md:mb-16">
        {/* 背景装饰图 (可选，这里用CSS模拟) */}
        <div className="absolute inset-0 z-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(#C41200 2px, transparent 2px)', backgroundSize: '20px 20px' }}>
        </div>

        <div className="relative z-10 mx-auto max-w-4xl">
          <div className="mb-4 flex flex-wrap justify-center gap-3">
            <span className="rotate-3 transform border-2 border-black bg-kfc-yellow px-3 py-1 text-sm font-black uppercase text-black shadow-neo-sm md:text-base">
              User Generated Content / 用户共创
            </span>
            <span className="-rotate-2 transform border-2 border-black bg-white px-3 py-1 text-sm font-black uppercase text-black shadow-neo-sm md:text-base">
              Since 2024 /始于疯狂
            </span>
          </div>

          <h1 className="mb-6 text-4xl font-black italic tracking-tighter text-kfc-red drop-shadow-[2px_2px_0px_#000] md:text-6xl lg:text-7xl">
            {randomCopy.line1} <br className="md:hidden" />
            <span className="text-black">{randomCopy.line2}</span>
          </h1>

          <div className="mx-auto max-w-2xl transform border-3 border-black bg-white p-4 shadow-neo-yellow transition-transform hover:scale-[1.01] md:rotate-1">
            <p className="text-lg font-bold text-black md:text-xl">
              全网爆文 / 纳趣段子 / 文案
              <br />
              <span className="bg-kfc-red px-1 text-white">文化站排面拉满！</span>
            </p>
          </div>
        </div>
      </div>

      {/* 2. 今日精选文案 (3 Column Grid) */}
      <div className="mb-16">
        <div className="mb-6 flex items-center justify-between border-b-4 border-black pb-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚡️</span>
            <h2 className="text-2xl font-black italic text-black md:text-3xl">今日精选文案</h2>
          </div>
          <Link href="/jokes" className="hidden text-sm font-bold underline decoration-2 underline-offset-4 hover:text-kfc-red md:block">
            VIEW ARCHIVE / 查看全部
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {selectedJokes.map((joke, index) => (
            <Link
              key={joke.id}
              href={`/jokes/${joke.id}`}
              className="group flex h-full flex-col border-3 border-black bg-white p-5 shadow-neo transition-all hover:-translate-y-1 hover:shadow-neo-lg"
            >
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-black bg-gray-100 text-lg">
                  {['😭', '🤡', '💔'][index % 3]}
                </span>
                <span className="font-bold text-gray-500 text-xs uppercase tracking-wider">Top Pick #{index + 1} / 精选推荐</span>
              </div>
              <p className="mb-4 line-clamp-4 flex-1 text-justify font-medium leading-relaxed text-gray-800">
                {joke.body}
              </p>
              <div className="mt-auto flex items-center justify-between border-t-2 border-dashed border-gray-200 pt-3 text-xs font-bold text-gray-400">
                <span>@{joke.author?.username || 'KFC Lover'}</span>
                <span>🔥 Hot / 热门</span>
              </div>
            </Link>
          ))}
        </div>
        <div className="mt-4 text-center md:hidden">
          <Link href="/jokes" className="text-sm font-bold underline decoration-2 underline-offset-4">
            查看更多结晶 &rarr;
          </Link>
        </div>
      </div>

      {/* 3. 今日爆款段子 (Headline) */}
      <div className="mb-16">
        <div className="mb-2 flex items-center gap-2 border-b-4 border-kfc-red pb-2">
          <span className="text-2xl">🚀</span>
          <h2 className="text-2xl font-black italic text-kfc-red md:text-3xl">今日爆款段子</h2>
        </div>
        <div className="bg-kfc-red/5 p-2 md:p-4">
          <div className="flex flex-col gap-6 md:flex-row">
            <div className="flex-1">
              <Link
                href={headlineJoke ? `/jokes/${headlineJoke.id}` : '#'}
                className="block border-3 border-black bg-white p-6 shadow-neo-xl transition-all hover:translate-y-[-2px] hover:shadow-neo-2xl lg:p-8"
              >
                <div className="mb-4">
                  <span className="mr-2 inline-block border-2 border-black bg-black px-2 py-0.5 text-xs font-bold text-white">
                    HEADLINE
                  </span>
                  <span className="text-xs font-bold text-gray-400">
                    {new Date(headlineJoke?.createdAt || Date.now()).toLocaleDateString('zh-CN')}
                  </span>
                </div>
                {/* 限制高度，超出隐藏 */}
                <div className="line-clamp-6 text-xl font-bold leading-loose text-gray-900 md:text-2xl">
                  {headlineJoke?.body}
                </div>
                <div className="mt-6 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 overflow-hidden rounded-full border-2 border-black bg-gray-200">
                      {headlineJoke?.author?.avatarUrl ? (
                        <Image
                          src={headlineJoke.author.avatarUrl}
                          alt={headlineJoke.author.username}
                          width={32}
                          height={32}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <svg className="h-full w-full p-1 text-gray-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                      )}
                    </div>
                    <span className="font-bold">@{headlineJoke?.author?.username || '匿名疯四人'}</span>
                  </div>
                  <div className="font-black italic text-kfc-red text-xl">
                    V 我 50
                  </div>
                </div>
              </Link>
            </div>

            {/* 右侧配图区域 (模拟) */}
            <div className="w-full md:w-1/3">
              <div className="relative h-full min-h-[200px] w-full border-3 border-black bg-white p-2 shadow-neo">
                <div className="flex h-full w-full flex-col items-center justify-center bg-gray-100 p-4 text-center">
                  <span className="text-4xl">🐼</span>
                  <p className="mt-2 text-sm font-bold text-gray-500">
                    (此处应有熊猫头表情包)
                  </p>
                  <div className="mt-4 w-full border-t border-black pt-4">
                    <div className="bg-kfc-newsprint p-2 text-xs font-bold">
                      “我也想吃疯狂星期四”
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. 底部功能区 (Crazy Quote Library) */}
      <div className="mb-12">
        <div className="mb-6 flex items-center gap-2 border-b-4 border-black pb-2">
          <span className="text-2xl">📚</span>
          <h2 className="text-2xl font-black italic text-black md:text-3xl">疯狂语录库</h2>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {/* 乞讨 */}
          <Link href="/jokes?tag=乞讨" className="group relative block h-24 overflow-hidden border-2 border-black bg-[#F4E4BC] shadow-neo transition-all hover:translate-y-1 hover:shadow-none">
            <div className="flex h-full items-center justify-between px-4">
              <div className="z-10">
                <h3 className="text-xl font-black italic text-[#8B4513]">🥺 乞讨</h3>
                <p className="text-xs font-bold text-[#8B4513]/70">硬核乞讨 v50</p>
              </div>
              <div className="absolute -bottom-4 -right-4 text-6xl opacity-20 grayscale transition-all group-hover:scale-110 group-hover:grayscale-0">🥺</div>
            </div>
          </Link>

          {/* 感情 */}
          <Link href="/jokes?tag=感情" className="group relative block h-24 overflow-hidden border-2 border-black bg-[#FFD1DC] shadow-neo transition-all hover:translate-y-1 hover:shadow-none">
            <div className="flex h-full items-center justify-between px-4">
              <div className="z-10">
                <h3 className="text-xl font-black italic text-[#C41200]">💔 感情</h3>
                <p className="text-xs font-bold text-[#C41200]/70">破碎感拉满</p>
              </div>
              <div className="absolute -bottom-4 -right-4 text-6xl opacity-20 grayscale transition-all group-hover:scale-110 group-hover:grayscale-0">💔</div>
            </div>
          </Link>

          {/* 哲学 */}
          <Link href="/jokes?tag=哲学" className="group relative block h-24 overflow-hidden border-2 border-black bg-[#E0F7FA] shadow-neo transition-all hover:translate-y-1 hover:shadow-none">
            <div className="flex h-full items-center justify-between px-4">
              <div className="z-10">
                <h3 className="text-xl font-black italic text-[#006064]">� 哲学</h3>
                <p className="text-xs font-bold text-[#006064]/70">废话文学大赏</p>
              </div>
              <div className="absolute -bottom-4 -right-4 text-6xl opacity-20 grayscale transition-all group-hover:scale-110 group-hover:grayscale-0">�</div>
            </div>
          </Link>

          {/* 职场 */}
          <Link href="/jokes?tag=职场" className="group relative block h-24 overflow-hidden border-2 border-black bg-[#E1BEE7] shadow-neo transition-all hover:translate-y-1 hover:shadow-none">
            <div className="flex h-full items-center justify-between px-4">
              <div className="z-10">
                <h3 className="text-xl font-black italic text-[#4A148C]">💼 职场</h3>
                <p className="text-xs font-bold text-[#4A148C]/70">打工人的怒吼</p>
              </div>
              <div className="absolute -bottom-4 -right-4 text-6xl opacity-20 grayscale transition-all group-hover:scale-110 group-hover:grayscale-0">💼</div>
            </div>
          </Link>
        </div>
      </div>

      {/* 5. 底部功能区 (Footer CTA) */}
      <section className="relative mt-20 border-t-4 border-black bg-kfc-red py-12 text-center text-white">
        <div className="container mx-auto px-4">
          <h2 className="mb-4 text-4xl font-black italic drop-shadow-[4px_4px_0_#000]">
            文案品评会
          </h2>
          <div className="mx-auto mb-8 max-w-xl border-2 border-black bg-kfc-yellow p-4 shadow-[8px_8px_0_0_#000] rotate-2 transform">
            <h3 className="text-2xl font-black italic text-black">疯狂星期四！</h3>
          </div>

          <NeoButton href="/submit" variant="secondary" size="lg" icon="fa-arrow-right">
            Start Submission / 开始上交你的疯狂文案
          </NeoButton>
        </div>
      </section>
    </div >
  )
}
