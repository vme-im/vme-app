import Image from 'next/image'
import Link from 'next/link'
import NeoButton from '@/components/shared/NeoButton'
import Icon from '@/components/shared/Icon'
import SectionTitle from '@/components/shared/SectionTitle'

import {
  getFeaturedJokes,
  getRandomKfcItem,
  extractImageUrl,
  getTopTags,
  getLatestKfcItems,
  getTopReactedKfcItems,
  getTopContributors,
} from '@/lib/server-utils'
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

/** 列表用短日期：M月D日 */
function formatShortDate(iso?: string): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })
}

/** byline：@作者 · 日期 · ♥数 */
function Byline({ item }: { item: IKfcItem }) {
  const username = item.author?.username || '匿名疯四人'
  return (
    <p className="text-news-gray text-xs">
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
  // 让版式自然降级（头条给占位文案、热图给占位卡），不整页 500。
  // 新增区块同样兜底：拿不到数据（返回空数组 / null）时整个区块不渲染，不做假数据。
  const [
    selectedJokes,
    headlineJoke,
    randomMeme,
    topTags,
    latestItems,
    topReactedItems,
    gutterJoke,
    topContributors,
  ] = await Promise.all([
    getFeaturedJokes(),
    getRandomKfcItem('text').catch(() => null),
    getRandomKfcItem('meme').catch(() => null),
    getTopTags(),
    getLatestKfcItems(7).catch(() => []),
    getTopReactedKfcItems(5).catch(() => []),
    getRandomKfcItem('text').catch(() => null),
    getTopContributors(6).catch(() => []),
  ])

  const memeImageUrl = randomMeme ? extractImageUrl(randomMeme.body) : null
  const heroCopy = HERO_COPIES[pickIndex(headlineJoke?.id ?? '', HERO_COPIES.length)]

  // 本周金句：与头条撞车时放弃本次金句（避免同一条文案在首页出现两次）
  const gutterQuote = gutterJoke && gutterJoke.id !== headlineJoke?.id ? gutterJoke : null

  // 头条：大标题取 title，正文摘录取 body（两者不同才展示摘录，避免重复）
  const headlineTitle = headlineJoke?.title?.trim() || headlineJoke?.body?.trim() || ''
  const headlineBody = headlineJoke?.body?.trim() || ''
  const showExcerpt = headlineBody && headlineBody !== headlineTitle

  return (
    <div className="container mx-auto px-4 py-8 md:py-10">
      {/* 1. 今日最疯（全页唯一的最响元素：大字号 + 大贴纸 + 阴影都在这） */}
      <section className="border-b-4 border-black pb-10">
        <div className="grid gap-6 md:grid-cols-3 md:gap-8">
          {/* 头条正文 */}
          <div className="min-w-0 md:col-span-2">
            <span className="bg-kfc-yellow shadow-neo inline-block rotate-2 border-2 border-black px-3 py-1 text-sm font-black text-black">
              今日最疯
            </span>

            {/* 本期宣言（hero 精神并入头条引题） */}
            <p className="text-kfc-red mt-4 text-sm font-bold md:text-base">
              {heroCopy.line1} · {heroCopy.line2}
            </p>

            {headlineJoke ? (
              <Link href={`/jokes/${headlineJoke.id}`} className="group block">
                <h2 className="group-hover:text-kfc-red mt-2 line-clamp-4 text-3xl leading-tight font-black tracking-tight wrap-anywhere text-black transition-colors md:text-5xl">
                  {headlineTitle}
                </h2>
                {showExcerpt && (
                  <p className="text-news-gray mt-4 line-clamp-3 leading-relaxed wrap-anywhere">
                    {headlineBody}
                  </p>
                )}
              </Link>
            ) : (
              <p className="text-news-gray mt-4">今天还没人整活，去上交一条文案吧。</p>
            )}

            {headlineJoke && (
              <div className="mt-5">
                <Byline item={headlineJoke} />
              </div>
            )}
          </div>

          {/* 今日热图 */}
          <div className="md:col-span-1">
            <Link
              href={randomMeme ? `/jokes/${randomMeme.id}` : '#'}
              className="shadow-neo hover:shadow-neo-lg block border-3 border-black bg-white transition-all hover:-translate-x-0.5 hover:-translate-y-0.5"
            >
              <div className="bg-kfc-cream relative aspect-[4/3] w-full overflow-hidden">
                {memeImageUrl ? (
                  <Image src={memeImageUrl} alt="今日热图" fill className="object-contain p-2" />
                ) : (
                  <div className="text-news-gray flex h-full flex-col items-center justify-center gap-2">
                    <Icon name="image" className="text-3xl" />
                    <span className="text-xs font-bold">今日暂无热图</span>
                  </div>
                )}
              </div>
              <div className="bg-kfc-yellow border-t-2 border-black px-3 py-1.5 text-center text-xs font-black tracking-wide text-black">
                今日热图
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* 2. 精选好活（三栏纯排版，列表级安静：栏内只有 #tag、正文与 byline） */}
      {selectedJokes.length > 0 && (
        <section className="my-12">
          <SectionTitle label="精选好活" action={{ label: '看全部文案', href: '/jokes' }} />
          <div className="divide-news-rule mt-5 grid divide-y md:grid-cols-3 md:divide-x md:divide-y-0">
            {selectedJokes.map((item) => {
              const columnTag = item.tags?.[0] || '精选'
              return (
                <div
                  key={item.id}
                  className="min-w-0 py-6 md:px-6 md:py-2 md:first:pl-0 md:last:pr-0"
                >
                  <div className="text-news-gray text-xs font-bold">#{columnTag}</div>
                  <Link href={`/jokes/${item.id}`} className="group mt-3 block">
                    {/* wrap-anywhere：超长无断点串（v5v5…）参与 min-content 计算，防 grid 撑爆 */}
                    <p className="group-hover:text-kfc-red line-clamp-5 leading-relaxed font-medium wrap-anywhere text-black transition-colors">
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
        </section>
      )}

      {/* 3. 双栏带：左 2/3「新鲜出炉」最新收录 + 右 1/3「被 V 爆的」高赞榜，中间竖分栏线，窄屏堆叠 */}
      {(latestItems.length > 0 || topReactedItems.length > 0) && (
        <section className="border-news-rule my-12 border-t pt-8">
          <div className="divide-news-rule grid gap-y-10 md:grid-cols-3 md:gap-y-0 md:divide-x">
            {/* 新鲜出炉：最新收录 */}
            {latestItems.length > 0 && (
              <div className="min-w-0 md:col-span-2 md:pr-8">
                <SectionTitle label="新鲜出炉" action={{ label: '查看全部', href: '/jokes' }} />
                <ul className="border-news-rule divide-news-rule mt-4 divide-y border-t">
                  {latestItems.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={`/jokes/${item.id}`}
                        className="group flex min-h-[44px] items-baseline gap-2.5 py-2.5 md:min-h-0"
                      >
                        <span className="text-kfc-red shrink-0 text-xs leading-relaxed">▪</span>
                        <span className="min-w-0">
                          <span className="group-hover:text-kfc-red line-clamp-2 text-sm leading-relaxed font-medium wrap-anywhere text-black transition-colors">
                            {item.body}
                          </span>
                          <span className="text-news-gray mt-0.5 block text-xs">
                            @{item.author?.username || '匿名疯四人'} ·{' '}
                            {formatShortDate(item.createdAt)}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 被 V 爆的：历史 reactions 前 5，第一名加大 */}
            {topReactedItems.length > 0 && (
              <div className={`min-w-0 ${latestItems.length > 0 ? 'md:pl-8' : 'md:col-span-3'}`}>
                <SectionTitle
                  label="被 V 爆的"
                  action={{ label: '英雄榜', href: '/leaderboard' }}
                />
                <ol className="border-news-rule divide-news-rule mt-4 divide-y border-t">
                  {topReactedItems.map((item, index) => (
                    <li key={item.id}>
                      <Link href={`/jokes/${item.id}`} className="group flex gap-3 py-3">
                        <span
                          className={`font-display w-6 shrink-0 text-center leading-none font-black ${
                            index === 0 ? 'text-kfc-red text-3xl' : 'text-news-gray pt-0.5 text-xl'
                          }`}
                        >
                          {index + 1}
                        </span>
                        <span className="min-w-0">
                          <span
                            className={`group-hover:text-kfc-red wrap-anywhere text-black transition-colors ${
                              index === 0
                                ? 'line-clamp-3 leading-relaxed font-black'
                                : 'line-clamp-2 text-sm leading-relaxed font-bold'
                            }`}
                          >
                            {item.body}
                          </span>
                          <span className="text-news-gray mt-0.5 block text-xs">
                            ♥ {item.reactions?.totalCount ?? 0} · @
                            {item.author?.username || '匿名疯四人'}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 4. 黑底标签条：热门标签 */}
      <section className="bg-kfc-black my-12 flex flex-wrap items-center gap-x-5 gap-y-1 border-y-4 border-black px-5 py-3">
        <span className="text-kfc-yellow shrink-0 py-1 text-sm font-black tracking-wide">
          热门标签
        </span>
        {topTags.length > 0 ? (
          topTags.map((t) => (
            <Link
              key={t.tag}
              href={`/jokes?tag=${encodeURIComponent(t.tag)}`}
              className="hover:text-kfc-yellow inline-flex items-center py-1.5 text-sm font-bold text-white transition-colors"
            >
              {t.tag}
              <span className="text-kfc-yellow ml-1">{t.count}</span>
            </Link>
          ))
        ) : (
          <span className="py-1 text-sm font-bold text-white/70">暂无高频标签，去上交文案吧</span>
        )}
      </section>

      {/* 5. 本周金句：头条之外唯一放大的元素，只靠大黑体字号 + 引号撑，不再堆阴影 */}
      {gutterQuote && (
        <section className="my-12 border-y-4 border-black px-4 py-10 text-center">
          <div className="flex justify-center">
            <SectionTitle label="本周金句" />
          </div>
          <Link href={`/jokes/${gutterQuote.id}`} className="group mt-6 block">
            <p className="group-hover:text-kfc-red mx-auto line-clamp-4 max-w-3xl text-2xl leading-relaxed font-black tracking-tight wrap-anywhere text-black transition-colors md:text-3xl">
              「{gutterQuote.body.trim()}」
            </p>
          </Link>
          <div className="mt-5">
            <Byline item={gutterQuote} />
          </div>
        </section>
      )}

      {/* 6. 文案鬼才：投稿数最高的鬼才，横排一条 */}
      {topContributors.length > 0 && (
        <section className="border-news-rule my-12 border-y py-5">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <span className="bg-kfc-yellow shadow-neo-sm inline-block shrink-0 -rotate-1 border-2 border-black px-2.5 py-1 text-xs font-black tracking-wide text-black">
              文案鬼才
            </span>
            <div className="flex min-w-0 flex-wrap items-center gap-x-6 gap-y-3">
              {topContributors.map((c) => (
                <Link
                  key={c.username}
                  href={`/authors/${encodeURIComponent(c.username)}`}
                  className="group flex min-h-[44px] min-w-0 max-w-full items-center gap-2 md:min-h-0"
                >
                  <span className="shrink-0 border-2 border-black bg-white p-0.5">
                    <Image
                      src={c.avatarUrl}
                      alt={`${c.username} 的头像`}
                      width={28}
                      height={28}
                      className="h-7 w-7 object-cover"
                    />
                  </span>
                  <span className="group-hover:text-kfc-red min-w-0 text-sm font-bold wrap-anywhere text-black transition-colors">
                    @{c.username}
                  </span>
                  <span className="text-news-gray font-display shrink-0 text-xs">{c.count}</span>
                </Link>
              ))}
            </div>
            <Link
              href="/leaderboard"
              className="text-news-gray hover:text-kfc-red ml-auto inline-flex min-h-[44px] shrink-0 items-center text-xs font-bold md:min-h-0"
            >
              V50 英雄榜 →
            </Link>
          </div>
        </section>
      )}

      {/* 7. 页尾 CTA */}
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
