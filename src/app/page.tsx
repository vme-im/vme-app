import Image from 'next/image'
import Link from 'next/link'
import NeoButton from '@/components/shared/NeoButton'

import { getFeaturedJokes, getRandomKfcItem, extractImageUrl, getTopTags } from '@/lib/server-utils'
import { getTagDisplay } from '@/lib/tags/taxonomy'

export default async function Page() {
  // 并行获取所有首页数据
  const [selectedJokes, headlineJoke, randomMeme, topTags] = await Promise.all([
    getFeaturedJokes(), // 在服务端确保获取3个不同作者的段子
    getRandomKfcItem('text'),
    getRandomKfcItem('meme'),
    getTopTags(),
  ])

  const memeImageUrl = randomMeme ? extractImageUrl(randomMeme.body) : null

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
  const randomCopy = HERO_COPIES[Math.floor(Math.random() * HERO_COPIES.length)]
  const TAG_STYLES = [
    {
      bg: 'bg-[#F4E4BC]',
      text: 'text-[#8B4513]',
      emoji: '🔥',
    },
    {
      bg: 'bg-[#FFD1DC]',
      text: 'text-[#C41200]',
      emoji: '💥',
    },
    {
      bg: 'bg-[#E0F7FA]',
      text: 'text-[#006064]',
      emoji: '✨',
    },
    {
      bg: 'bg-[#E1BEE7]',
      text: 'text-[#4A148C]',
      emoji: '⚡️',
    },
  ]
  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      {/* 1. Hero / 顶部横幅 */}
      <div className="relative mb-12 border-b-4 border-black pb-12 text-center md:mb-16">
        {/* 背景装饰图 (可选，这里用CSS模拟) */}
        <div
          className="absolute inset-0 z-0 opacity-10"
          style={{
            backgroundImage: 'radial-gradient(#C41200 2px, transparent 2px)',
            backgroundSize: '20px 20px',
          }}
        ></div>

        <div className="relative z-10 mx-auto max-w-4xl">
          <div className="mb-4 flex flex-wrap justify-center gap-3">
            <span className="bg-kfc-yellow shadow-neo-sm rotate-3 transform border-2 border-black px-3 py-1 text-sm font-black text-black uppercase md:text-base">
              User Generated Content / 用户共创
            </span>
            <span className="shadow-neo-sm -rotate-2 transform border-2 border-black bg-white px-3 py-1 text-sm font-black text-black uppercase md:text-base">
              Since 2024 /始于疯狂
            </span>
          </div>

          <h1 className="text-kfc-red mb-6 text-4xl font-black tracking-tighter italic drop-shadow-[2px_2px_0px_#000] md:text-6xl lg:text-7xl">
            {randomCopy.line1} <br />
            <span className="text-black">{randomCopy.line2}</span>
          </h1>

          <div className="shadow-neo-yellow mx-auto max-w-2xl transform border-3 border-black bg-white p-4 transition-transform hover:scale-[1.01] md:rotate-1">
            <p className="text-lg font-bold text-black md:text-xl">
              全网爆文 / 纳趣段子 / 文案 / 梗图
              <br />
              <span className="bg-kfc-red px-1 text-white">精神状态遥遥领先！</span>
            </p>
          </div>
        </div>
      </div>

      {/* 2. 今日精选文案 (3 Column Grid) */}
      <div className="mb-16">
        <div className="mb-6 flex items-center justify-between border-b-4 border-black pb-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚡️</span>
            <h2 className="text-2xl font-black text-black italic md:text-3xl">今日精选文案</h2>
          </div>
          <Link
            href="/jokes"
            className="hover:text-kfc-red hidden text-sm font-bold underline decoration-2 underline-offset-4 md:block"
          >
            VIEW ARCHIVE / 查看全部
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {selectedJokes.map((item, index) => (
            <Link
              key={item.id}
              href={`/jokes/${item.id}`}
              className="group shadow-neo hover:shadow-neo-lg relative flex h-full w-full min-w-0 flex-col overflow-hidden border-3 border-black bg-white p-5 transition-all hover:-translate-y-1"
            >
              {/* Background Emoji Decoration */}
              <div className="font-funny pointer-events-none absolute -right-4 -bottom-4 z-0 rotate-12 text-8xl opacity-20 transition-transform select-none group-hover:scale-110">
                {['😭', '🤡', '💔'][index % 3]}
              </div>

              <div className="relative z-10 mb-3 flex flex-wrap items-center gap-3">
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border-2 border-black bg-gray-100 shadow-[2px_2px_0_0_#000]">
                  {item.author?.avatarUrl ? (
                    <Image
                      src={item.author.avatarUrl}
                      alt={item.author.username || 'User'}
                      width={40}
                      height={40}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <svg
                      className="h-full w-full p-1 text-gray-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold tracking-wider text-gray-500 uppercase">
                    Top Pick #{index + 1}
                  </span>
                  <span className="text-xs font-black text-black">精选推荐</span>
                </div>
              </div>
              <p className="relative z-10 mb-4 line-clamp-4 flex-1 text-justify leading-relaxed font-medium break-all text-gray-800">
                {item.body}
              </p>
              <div className="relative z-10 mt-auto flex items-center justify-between border-t-2 border-dashed border-gray-200 pt-3 text-xs font-bold text-gray-400">
                <span className="max-w-40 truncate">@{item.author?.username || 'KFC Lover'}</span>
                <span className="shrink-0">🔥 Hot / 热门</span>
              </div>
            </Link>
          ))}
        </div>
        <div className="mt-4 text-center md:hidden">
          <Link
            href="/jokes"
            className="text-sm font-bold underline decoration-2 underline-offset-4"
          >
            VIEW ARCHIVE / 查看全部 &rarr;
          </Link>
        </div>
      </div>

      {/* 3. 今日爆款段子 (Headline) */}
      <div className="mb-16">
        <div className="border-kfc-red mb-2 flex items-center gap-2 border-b-4 pb-2">
          <span className="text-2xl">🚀</span>
          <h2 className="text-kfc-red text-2xl font-black italic md:text-3xl">今日爆款段子</h2>
        </div>
        <div className="bg-kfc-red/5 p-2 md:p-4">
          <div className="flex flex-col gap-6 md:h-96 md:flex-row">
            <div className="h-full flex-1">
              <Link
                href={headlineJoke ? `/jokes/${headlineJoke.id}` : '#'}
                className="shadow-neo-xl hover:shadow-neo-2xl flex h-full flex-col border-3 border-black bg-white p-6 transition-all hover:translate-y-[-2px] lg:p-8"
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
                <div className="mb-4 line-clamp-6 text-xl leading-loose font-bold break-all text-gray-900 md:text-2xl">
                  {headlineJoke?.body}
                </div>
                <div className="mt-auto flex items-center justify-between">
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
                        <svg
                          className="h-full w-full p-1 text-gray-500"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                    <span className="font-bold">
                      @{headlineJoke?.author?.username || '匿名疯四人'}
                    </span>
                  </div>
                  <div className="text-kfc-red text-xl font-black italic">V 我 50</div>
                </div>
              </Link>
            </div>

            {/* 右侧配图区域 (展示真实梗图) */}
            <div className="h-full w-full md:w-1/3">
              <Link
                href={randomMeme ? `/jokes/${randomMeme.id}` : '#'}
                className="group shadow-neo hover:shadow-neo-lg relative block h-full w-full border-3 border-black bg-white p-2 transition-all hover:-translate-y-1"
              >
                <div className="flex h-full w-full flex-col overflow-hidden">
                  <div className="relative flex min-h-[250px] flex-1 items-center justify-center bg-gray-100">
                    {memeImageUrl ? (
                      <Image
                        src={memeImageUrl}
                        alt="KFC Meme"
                        fill
                        className="object-contain p-2"
                      />
                    ) : (
                      <div className="flex flex-col items-center">
                        <span className="text-4xl">🐼</span>
                        <p className="mt-2 text-sm font-bold text-gray-500">
                          疯狂星期四，没图怎么行
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="mt-2 border-t-2 border-black pt-2">
                    <div className="bg-kfc-yellow p-2 text-center text-xs font-black text-black uppercase italic">
                      Hot Meme / 实时热门梗图
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 4. 底部功能区 (Crazy Quote Library) */}
      <div className="mb-12">
        <div className="mb-6 flex items-center gap-2 border-b-4 border-black pb-2">
          <span className="text-2xl">📚</span>
          <h2 className="text-2xl font-black text-black italic md:text-3xl">疯狂语录库</h2>
        </div>

        {topTags.length === 0 ? (
          <div className="border-2 border-black bg-white p-4 text-center text-sm font-bold text-black shadow-neo-sm">
            暂无高频标签，去上交文案吧
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {topTags.map((tagItem, index) => {
              const style = TAG_STYLES[index % TAG_STYLES.length]
              const displayTag = getTagDisplay(tagItem.tag)
              return (
                <Link
                  key={tagItem.tag}
                  href={`/jokes?tag=${encodeURIComponent(tagItem.tag)}`}
                  className={`group shadow-neo relative block h-24 overflow-hidden border-2 border-black ${style.bg} transition-all hover:translate-y-1 hover:shadow-none`}
                >
                  <div className="flex h-full items-center justify-between px-4">
                    <div className="z-10">
                      <h3 className={`text-xl font-black italic ${style.text}`}>
                        {style.emoji} {displayTag.label}
                      </h3>
                      <p className={`text-xs font-bold ${style.text}/70`}>
                        {displayTag.description}
                      </p>
                    </div>
                    <div className="absolute -right-4 -bottom-4 text-6xl opacity-20 grayscale transition-all group-hover:scale-110 group-hover:grayscale-0">
                      {style.emoji}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* 5. 底部功能区 (Footer CTA) */}
      <section className="bg-kfc-red relative mt-20 overflow-hidden border-t-4 border-black py-16 text-center text-white">
        {/* 背景圆点 */}
        <div
          className="pointer-events-none absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'radial-gradient(#fff 1.5px, transparent 1.5px)',
            backgroundSize: '16px 16px',
          }}
        />
        <div className="relative container mx-auto px-4">
          <div className="mb-3 flex flex-wrap justify-center gap-3">
            <span className="bg-kfc-yellow shadow-neo-sm -rotate-1 border-2 border-black px-3 py-1 text-xs font-black text-black uppercase">
              User Submissions / 全民共创
            </span>
            <span className="bg-white shadow-neo-sm rotate-1 border-2 border-black px-3 py-1 text-xs font-black text-black uppercase">
              Since 2024 / 始于疯狂
            </span>
          </div>

          <h2 className="mb-6 text-4xl font-black italic drop-shadow-[4px_4px_0_#000] md:text-5xl">
            你的文案，
            <br className="md:hidden" />
            今天上交了吗？
          </h2>

          <div className="bg-kfc-yellow mx-auto mb-8 max-w-xl rotate-2 transform border-2 border-black p-4 shadow-[8px_8px_0_0_#000]">
            <h3 className="text-xl font-black text-black italic md:text-2xl">
              🍗 疯狂星期四！把你的好活交出来 🍗
            </h3>
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            <NeoButton href="/submit" variant="secondary" size="lg" icon="fa-arrow-right">
              Start Submission / 开始上交
            </NeoButton>
            <NeoButton href="/leaderboard" variant="black" size="lg" icon="fa-trophy">
              英雄榜 / Hall of Fame
            </NeoButton>
          </div>

          <p className="mt-8 text-sm font-bold text-white/60 uppercase">
            * All submissions reviewed via GitHub Issues for full transparency
          </p>
        </div>
      </section>
    </div>
  )
}
