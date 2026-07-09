import Image from 'next/image'
import Link from 'next/link'
import NeoButton from '@/components/shared/NeoButton'
import Icon from '@/components/shared/Icon'

import { getFeaturedJokes, getRandomKfcItem, extractImageUrl, getTopTags } from '@/lib/server-utils'
import type { IKfcItem } from '@/types'

// 本期宣言：轮换的自嘲金句，作为今日头条的引题（kicker）
const HERO_COPIES = [
  { line1: '错过今天的疯狂星期四', line2: '你将失去一切' },
  { line1: '别问这周四疯不疯', line2: '直接 V 我 50' },
  { line1: '世界上最遥远的距离', line2: '是你读完文案却没 V 我 50' },
  { line1: '注意看，这个男人叫小帅', line2: '他想请你 V 他 50' },
  { line1: '如果今天不疯狂', line2: '那人生还有什么意义' },
  { line1: 'V me 50', line2: 'Manners Maketh Man' },
]

// 由稳定字符串派生一个下标（纯函数），用来轮换文案而不引入 Math.random
function pickIndex(seed: string, len: number): number {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  return len > 0 ? hash % len : 0
}

function formatDate(iso?: string): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/** byline：文 / @作者 · 日期 · ♥数 */
function Byline({ item }: { item: IKfcItem }) {
  const username = item.author?.username || '匿名疯四人'
  return (
    <p className="text-news-gray text-xs">
      文 /{' '}
      {item.author?.username ? (
        <Link
          href={`/authors/${encodeURIComponent(username)}`}
          className="text-kfc-black hover:text-kfc-red font-bold"
        >
          @{username}
        </Link>
      ) : (
        <span className="text-kfc-black font-bold">@{username}</span>
      )}
      {' · '}
      {formatDate(item.createdAt)}
      {' · ♥ '}
      {item.reactions?.totalCount ?? 0}
    </p>
  )
}

export default async function Page() {
  // 并行获取所有首页数据（沿用既有数据链路）。
  // 头条/热图取随机项，池子为空时 getRandomKfcItem 会抛错——在页面层兜底为 null，
  // 让版面自然降级（头条给占位文案、热图给占位卡），不整页 500。
  const [selectedJokes, headlineJoke, randomMeme, topTags] = await Promise.all([
    getFeaturedJokes(),
    getRandomKfcItem('text').catch(() => null),
    getRandomKfcItem('meme').catch(() => null),
    getTopTags(),
  ])

  const memeImageUrl = randomMeme ? extractImageUrl(randomMeme.body) : null
  const heroCopy = HERO_COPIES[pickIndex(headlineJoke?.id ?? '', HERO_COPIES.length)]

  // 头条：大标题取 title，正文摘录取 body（两者不同才展示摘录，避免重复）
  const headlineTitle = headlineJoke?.title?.trim() || headlineJoke?.body?.trim() || ''
  const headlineBody = headlineJoke?.body?.trim() || ''
  const showExcerpt = headlineBody && headlineBody !== headlineTitle

  return (
    <div className="container mx-auto px-4 py-8 md:py-10">
      {/* 1. 今日头条 */}
      <section className="border-b-4 border-black pb-10">
        <div className="grid gap-6 md:grid-cols-3 md:gap-8">
          {/* 头条正文 */}
          <div className="md:col-span-2">
            <span className="bg-kfc-yellow shadow-neo-sm inline-block rotate-2 border-2 border-black px-3 py-1 text-sm font-black text-black">
              今日头条
            </span>

            {/* 本期宣言（hero 精神并入头条引题） */}
            <p className="text-kfc-red mt-4 text-sm font-bold md:text-base">
              {heroCopy.line1} · {heroCopy.line2}
            </p>

            {headlineJoke ? (
              <Link href={`/jokes/${headlineJoke.id}`} className="group block">
                <h2 className="group-hover:text-kfc-red mt-2 line-clamp-4 text-3xl leading-tight font-black tracking-tight text-black transition-colors md:text-5xl">
                  {headlineTitle}
                </h2>
                {showExcerpt && (
                  <p className="text-news-gray mt-4 line-clamp-3 leading-relaxed">{headlineBody}</p>
                )}
              </Link>
            ) : (
              <p className="text-news-gray mt-4">今日暂无头条，去上交一条文案吧。</p>
            )}

            {headlineJoke && (
              <div className="mt-5">
                <Byline item={headlineJoke} />
              </div>
            )}
          </div>

          {/* 本期热图 */}
          <div className="md:col-span-1">
            <Link
              href={randomMeme ? `/jokes/${randomMeme.id}` : '#'}
              className="shadow-neo hover:shadow-neo-lg block border-3 border-black bg-white transition-all hover:-translate-x-0.5 hover:-translate-y-0.5"
            >
              <div className="bg-kfc-cream relative aspect-[4/3] w-full overflow-hidden">
                {memeImageUrl ? (
                  <Image src={memeImageUrl} alt="本期热图" fill className="object-contain p-2" />
                ) : (
                  <div className="text-news-gray flex h-full flex-col items-center justify-center gap-2">
                    <Icon name="image" className="text-3xl" />
                    <span className="text-xs font-bold">本期暂无热图</span>
                  </div>
                )}
              </div>
              <div className="bg-kfc-yellow border-t-2 border-black px-3 py-1.5 text-center text-xs font-black tracking-wide text-black">
                本期热图
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* 2. 专栏（三栏纯排版） */}
      {selectedJokes.length > 0 && (
        <section className="my-12">
          <div className="divide-news-rule grid divide-y md:grid-cols-3 md:divide-x md:divide-y-0">
            {selectedJokes.map((item) => {
              const columnTag = item.tags?.[0] || '精选'
              return (
                <div key={item.id} className="py-6 md:px-6 md:py-2 md:first:pl-0 md:last:pr-0">
                  <div className="text-kfc-red text-xs font-black tracking-wide">
                    专栏 · {columnTag}
                  </div>
                  <Link href={`/jokes/${item.id}`} className="group mt-3 block">
                    <p className="group-hover:text-kfc-red line-clamp-5 leading-relaxed font-medium text-black transition-colors">
                      {item.body}
                    </p>
                  </Link>
                  <div className="mt-3">
                    <Byline item={item} />
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-6 text-center">
            <Link href="/jokes" className="text-news-gray hover:text-kfc-red text-sm font-bold">
              翻阅全部文案 →
            </Link>
          </div>
        </section>
      )}

      {/* 3. 版面条：热门标签 */}
      <section className="bg-kfc-black my-12 flex flex-wrap items-center gap-x-6 gap-y-2 border-y-4 border-black px-5 py-4">
        <span className="text-kfc-yellow shrink-0 text-sm font-black tracking-wide">
          版面 · 热门标签
        </span>
        {topTags.length > 0 ? (
          topTags.map((t) => (
            <Link
              key={t.tag}
              href={`/jokes?tag=${encodeURIComponent(t.tag)}`}
              className="hover:text-kfc-yellow text-sm font-bold text-white transition-colors"
            >
              {t.tag}
              <span className="text-kfc-yellow ml-1">{t.count}</span>
            </Link>
          ))
        ) : (
          <span className="text-sm font-bold text-white/70">暂无高频标签，去上交文案吧</span>
        )}
      </section>

      {/* 4. 页尾 CTA */}
      <section className="bg-kfc-red mt-12 border-y-4 border-black px-4 py-14 text-center text-white">
        <h2 className="text-3xl font-black tracking-tight md:text-4xl">
          你的文案，
          <br className="md:hidden" />
          今天上交了吗？
        </h2>
        <p className="mx-auto mt-3 max-w-xl font-medium text-white/80">
          精神状态遥遥领先，就差你这一条好活。
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <NeoButton href="/submit" variant="secondary" size="lg" icon="pencil">
            我要投稿
          </NeoButton>
          <NeoButton href="/leaderboard" variant="black" size="lg" icon="trophy">
            英雄榜
          </NeoButton>
        </div>
      </section>
    </div>
  )
}
