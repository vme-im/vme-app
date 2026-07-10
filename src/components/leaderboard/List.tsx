import Image from 'next/image'
import Link from 'next/link'
import Icon from '@/components/shared/Icon'
import SectionTitle from '@/components/shared/SectionTitle'
import SortTabs from './SortTabs'

interface AuthorStats {
  username: string
  avatarUrl: string
  url: string
  totalPosts: number
  totalInteractions: number
  score: number
  posts: Array<{
    id: string
    title: string
    interactions: number
    createdAt: string
  }>
}

interface LeaderboardServerProps {
  sortBy?: string
}

async function getLeaderboardData(sortBy: string = 'score') {
  try {
    // 动态导入服务端工具函数，避免客户端bundle包含fs模块
    const { getAllKfcItems } = await import('@/lib/server-utils')

    // 获取所有文案数据
    const allItems = await getAllKfcItems()

    // 按作者分组
    const authorMap = new Map<string, AuthorStats>()

    // 初始化作者统计
    for (const item of allItems) {
      const { username, avatarUrl, url } = item.author

      if (!authorMap.has(username)) {
        authorMap.set(username, {
          username,
          avatarUrl,
          url,
          totalPosts: 0,
          totalInteractions: 0,
          score: 0,
          posts: [],
        })
      }

      const author = authorMap.get(username)!
      author.totalPosts++
      // 使用静态reactions数据
      author.posts.push({
        id: item.id,
        title: item.title,
        interactions: item.reactions?.totalCount || 0,
        createdAt: item.createdAt,
      })
    }

    // 计算作者总互动数据
    for (const [, author] of authorMap) {
      let totalInteractions = 0

      // 计算总互动数
      author.posts.forEach((post) => {
        totalInteractions += post.interactions
      })

      author.totalInteractions = totalInteractions

      // 计算 V50 指数：互动数 * 1.5 + 文案数 * 5
      author.score = totalInteractions * 1.5 + author.totalPosts * 5

      // 按热度排序作者的文案
      author.posts.sort((a, b) => {
        const scoreA = a.interactions
        const scoreB = b.interactions
        return scoreB - scoreA
      })
    }

    // 转换为数组并排序
    const authorsList = Array.from(authorMap.values())

    authorsList.sort((a, b) => {
      switch (sortBy) {
        case 'interactions':
          return b.totalInteractions - a.totalInteractions
        case 'posts':
          return b.totalPosts - a.totalPosts
        case 'score':
        default:
          return b.score - a.score
      }
    })

    // 只取前10名
    const topAuthors = authorsList.slice(0, 10)

    return {
      authors: topAuthors,
      sortBy,
      totalAuthors: authorsList.length,
      updatedAt: new Date().toISOString(),
    }
  } catch (error) {
    console.error('Failed to load leaderboard data:', error)
    return null
  }
}

// 设置组件级别的缓存时间（30分钟）
export const revalidate = 1800

/** 前三名领奖台配色：金（最响）/ 奶白 / 白，全部黑边硬阴影 */
function getPodiumStyle(rank: number): { bg: string; shadow: string; label: string } {
  switch (rank) {
    case 1:
      return { bg: 'bg-kfc-yellow', shadow: 'shadow-neo-lg', label: '冠军' }
    case 2:
      return { bg: 'bg-kfc-cream', shadow: 'shadow-neo', label: '亚军' }
    case 3:
      return { bg: 'bg-white', shadow: 'shadow-neo', label: '季军' }
    default:
      return { bg: 'bg-white', shadow: 'shadow-neo', label: '' }
  }
}

export default async function LeaderboardServer({ sortBy = 'score' }: LeaderboardServerProps) {
  const data = await getLeaderboardData(sortBy)

  if (!data) {
    return (
      <div className="border-news-rule border-y py-16 text-center">
        <h2 className="text-2xl font-black text-black">英雄榜暂时排不出来</h2>
        <p className="text-news-gray mt-2 text-sm font-medium">服务器也疯了，稍后再来。</p>
      </div>
    )
  }

  return (
    <>
      {/* 统一贴纸标题 + 排序 */}
      <div className="border-news-rule mb-8 border-b pb-3">
        <SectionTitle label={`共 ${data.totalAuthors} 人上榜`}>
          <SortTabs currentSort={data.sortBy} />
        </SectionTitle>
      </div>

      {/* 前三名：领奖台（本页最响元素） */}
      {data.authors.length >= 3 ? (
        <div className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {data.authors.slice(0, 3).map((author, index) => {
            const rank = index + 1
            const style = getPodiumStyle(rank)

            return (
              <div
                key={author.username}
                className={`group relative border-3 border-black ${style.bg} ${style.shadow} p-5 pt-9 text-center transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-neo-xl`}
              >
                {/* 名次贴纸（红底旋转） */}
                <div className="bg-kfc-red font-display shadow-neo-sm absolute -top-4 -left-3 flex -rotate-3 items-center gap-1 border-2 border-black px-2.5 py-0.5 text-white italic">
                  <span className="text-xs not-italic">No.</span>
                  <span className="text-2xl leading-none font-black">{rank}</span>
                </div>
                {/* 名次中文标签 */}
                <div className="text-news-gray absolute top-2 right-3 text-2xs font-black tracking-wide">
                  {style.label}
                </div>

                {/* 头像 + 用户名（→ 作者页） */}
                <Link href={`/authors/${encodeURIComponent(author.username)}`} className="block">
                  <div className="mb-3 flex justify-center">
                    <div className="shadow-neo-sm border-2 border-black bg-white p-1 transition-transform group-hover:-translate-y-0.5">
                      <Image
                        src={author.avatarUrl}
                        alt={`${author.username} 的头像`}
                        width={80}
                        height={80}
                        className="h-16 w-16 object-cover md:h-20 md:w-20"
                      />
                    </div>
                  </div>
                  <h3 className="group-hover:text-kfc-red wrap-anywhere text-lg font-black text-black transition-colors md:text-xl">
                    @{author.username}
                  </h3>
                </Link>

                {/* 统计（纯中文，无双语） */}
                <div className="text-news-gray mt-3 flex items-center justify-center gap-x-4 text-xs font-bold">
                  <span>投稿 {author.totalPosts}</span>
                  <span>互动 {author.totalInteractions.toLocaleString()}</span>
                </div>

                {/* V50 指数 */}
                <div className="shadow-neo-sm mt-4 inline-block border-2 border-black bg-white px-4 py-1 text-sm font-black text-black">
                  V50 指数 {Math.round(author.score)}
                </div>

                {/* GitHub 主页 */}
                <a
                  href={author.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-news-gray hover:text-kfc-red mt-4 flex items-center justify-center gap-1.5 border-t border-black/20 pt-3 text-xs font-bold transition-colors"
                >
                  <Icon name="github" />
                  GitHub 主页
                </a>
              </div>
            )
          })}
        </div>
      ) : null}

      {/* 第 4 名起：列表级纯排版 + 分隔线 */}
      {data.authors.length > 3 ? (
        <div>
          <SectionTitle label="第 4 名开外" className="mb-5" />
          <div className="border-news-rule divide-news-rule divide-y border-y">
            {data.authors.slice(3, 10).map((author, index) => {
              const rank = index + 4
              return (
                <Link
                  key={author.username}
                  href={`/authors/${encodeURIComponent(author.username)}`}
                  className="group flex items-center gap-4 py-4"
                >
                  {/* 名次 */}
                  <div className="font-display text-news-gray w-8 shrink-0 text-center text-xl font-black">
                    {rank}
                  </div>

                  {/* 头像 */}
                  <div className="shrink-0 border-2 border-black p-0.5">
                    <Image
                      src={author.avatarUrl}
                      alt={`${author.username} 的头像`}
                      width={48}
                      height={48}
                      className="h-10 w-10 object-cover"
                    />
                  </div>

                  {/* 用户信息 */}
                  <div className="min-w-0 flex-1">
                    <h3 className="group-hover:text-kfc-red truncate text-lg font-black text-black transition-colors">
                      @{author.username}
                    </h3>
                    <div className="text-news-gray text-xs font-bold">
                      投稿 {author.totalPosts} · V50 指数 {Math.round(author.score)}
                    </div>
                  </div>

                  {/* 互动数 */}
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Icon name="heart" className="text-kfc-red" />
                    <span className="text-lg font-black text-black">
                      {author.totalInteractions.toLocaleString()}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      ) : null}

      {/* 更新说明 */}
      <div className="text-news-gray mt-8 text-center text-xs font-bold">
        本榜单每 30 分钟重排一次
      </div>
    </>
  )
}
