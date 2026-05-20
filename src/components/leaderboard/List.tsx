import Image from 'next/image'
import Link from 'next/link'
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

    // 获取所有段子数据
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
    for (const [username, author] of authorMap) {
      let totalInteractions = 0

      // 计算总互动数
      author.posts.forEach((post) => {
        totalInteractions += post.interactions
      })

      author.totalInteractions = totalInteractions

      // 计算综合评分：互动数 * 1.5 + 段子数 * 5
      author.score = totalInteractions * 1.5 + author.totalPosts * 5

      // 按热度排序作者的段子
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

export default async function LeaderboardServer({ sortBy = 'score' }: LeaderboardServerProps) {
  const data = await getLeaderboardData(sortBy)

  if (!data) {
    return (
      <div className="rounded-lg bg-red-50 p-8 text-center">
        <div className="text-6xl">😅</div>
        <h2 className="mt-4 text-2xl font-bold text-red-600">英雄榜暂时无法加载</h2>
        <p className="mt-2 text-red-500">请稍后再试</p>
      </div>
    )
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-2xl font-bold text-gray-800">
          <i className="fa fa-book text-kfc-red"></i> V50 英雄榜
        </h2>

        {/* 排序选择 */}
        <SortTabs currentSort={data.sortBy} />
      </div>

      <div className="border-4 border-black bg-white p-6 shadow-neo-xl md:p-8">
        {/* Top 3 特殊展示 */}
        {data.authors.length >= 3 ? (
          <div className="mb-12">
            <h2 className="mb-8 text-center text-3xl font-black uppercase italic text-black md:text-4xl">
              <span className="bg-black px-4 py-1 text-white">Hall of Fame</span> 殿堂级鬼才
            </h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {data.authors.slice(0, 3).map((author, index) => {
                const getRankStyle = (rank: number) => {
                  switch (rank) {
                    case 1:
                      return {
                        bg: 'bg-kfc-yellow',
                        badge: '1ST',
                        title: 'text-black',
                      }
                    case 2:
                      return {
                        bg: 'bg-gray-300',
                        badge: '2ND',
                        title: 'text-black',
                      }
                    case 3:
                      return {
                        bg: 'bg-orange-300',
                        badge: '3RD',
                        title: 'text-black',
                      }
                    default:
                      return {
                        bg: 'bg-white',
                        badge: '?',
                        title: 'text-black',
                      }
                  }
                }

                const style = getRankStyle(index + 1)

                return (
                  <div
                    key={author.username}
                    className={`relative border-4 border-black ${style.bg} p-6 pt-10 text-center shadow-neo transition-transform hover:-translate-y-2 hover:shadow-neo-xl`}
                  >
                    {/* 排名徽章 */}
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 border-2 border-black bg-black px-3 py-1 text-xl font-black italic text-white shadow-neo-sm">
                      {style.badge}
                    </div>

                    {/* 头像 + 用户名（→ 作者页） */}
                    <Link
                      href={`/authors/${encodeURIComponent(author.username)}`}
                      className="block transition-transform hover:-translate-y-1"
                    >
                      <div className="mb-4 flex justify-center">
                        <div className="border-3 border-black bg-white p-1">
                          <Image
                            src={author.avatarUrl}
                            alt={`${author.username}的头像`}
                            width={80}
                            height={80}
                            className="h-20 w-20 object-cover"
                          />
                        </div>
                      </div>
                      <h3 className={`mb-2 text-xl font-black ${style.title} hover:underline`}>
                        @{author.username}
                      </h3>
                    </Link>

                    <div className="mb-4 space-y-1 text-sm font-bold text-black/80">
                      <div className="uppercase">Posts / 投稿: {author.totalPosts}</div>
                      <div className="uppercase">
                        Reactions / 互动: {author.totalInteractions.toLocaleString()}
                      </div>
                    </div>

                    {/* 综合评分 */}
                    <div className="inline-block border-2 border-black bg-white px-4 py-1 text-sm font-black uppercase text-black shadow-neo-sm">
                      Power / 战力: {Math.round(author.score)}
                    </div>

                    {/* GitHub 链接 */}
                    <Link
                      href={author.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 block border-t-2 border-black pt-2 text-xs font-bold uppercase text-black hover:text-white hover:bg-black transition-colors"
                    >
                      View GitHub / 查看主页
                    </Link>
                  </div>
                )
              })}
            </div>
          </div>
        ) : null}

        {/* 完整排行榜 */}
        {data.authors.length > 3 ? (
          <div>
            <h2 className="mb-6 border-b-4 border-black pb-2 text-2xl font-black uppercase italic text-black md:text-3xl">
              Leaderboard / 完整榜单
            </h2>
            <div className="space-y-4">
              {data.authors.slice(3, 10).map((author, index) => (
                <div
                  key={author.username}
                  className="flex flex-col gap-4 border-3 border-black bg-white p-4 shadow-neo transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex items-center gap-4">
                    {/* 排名 */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-black bg-black text-lg font-black text-white">
                      #{index + 4}
                    </div>

                    {/* 头像 + 用户信息（→ 作者页） */}
                    <Link
                      href={`/authors/${encodeURIComponent(author.username)}`}
                      className="flex flex-1 items-center gap-4"
                    >
                      <div className="border-2 border-black p-0.5">
                        <Image
                          src={author.avatarUrl}
                          alt={`${author.username}的头像`}
                          width={48}
                          height={48}
                          className="h-10 w-10 object-cover"
                        />
                      </div>

                      <div className="flex-1">
                        <h3 className="text-lg font-black text-black hover:underline">
                          @{author.username}
                        </h3>
                        <div className="text-xs font-bold uppercase text-gray-500">
                          {author.totalPosts} 投稿 • Score / 分数: {Math.round(author.score)}
                        </div>
                      </div>
                    </Link>
                  </div>

                  {/* 统计数据 */}
                  <div className="flex items-center gap-2 border-l-2 border-black pl-4">
                    <i className="fa fa-heart text-kfc-red"></i>
                    <div className="text-lg font-black text-black">
                      {author.totalInteractions.toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* 更新时间 */}
        <div className="mt-10 text-center text-sm text-gray-500">
          最后更新: {new Date(data.updatedAt).toLocaleString('zh-CN')}
        </div>
      </div>
    </>
  )
}
