import { Suspense } from 'react'
import { headers } from 'next/headers'
import LeaderboardList from '@/components/leaderboard/List'
import NeoButton from '@/components/shared/NeoButton'

// 获取URL参数的类型定义
interface PageProps {
  searchParams: Promise<{
    sortBy?: string
  }>
}

// 启用ISR - 每30分钟重新生成页面，包含排行榜数据
export const revalidate = 1800 // 30分钟重新验证，用于排行榜数据

export default async function LeaderboardPage(props: PageProps) {
  const searchParams = await props.searchParams
  // 从URL参数获取排序方式
  const sortBy = searchParams.sortBy || 'score'

  // 获取headers以构建request对象
  const headersList = await headers()
  const request = new Request('http://localhost', {
    headers: headersList,
  })

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 页面标题 */}
      <div className="mb-12 text-center md:mb-16">
        <h1 className="mb-6 text-5xl font-black italic tracking-tighter text-black md:text-7xl">
          V50 <span className="text-kfc-red underline decoration-4 underline-offset-4">英雄榜</span>
        </h1>
        <div className="inline-block -rotate-1 border-2 border-black bg-black px-6 py-2 shadow-neo-sm">
          <p className="font-bold uppercase text-white md:text-lg">
            HALL OF FAME / 看看谁是真正的文案鬼才，谁的文案最能打
          </p>
        </div>
      </div>

      {/* 梗王排行榜 - 服务端渲染 */}
      <Suspense
        fallback={
          <div className="flex h-64 items-center justify-center border-4 border-black bg-white p-8 shadow-neo">
            <div className="flex flex-col items-center gap-4 text-black">
              <span className="text-4xl animate-neo-blink">🏆</span>
              <span className="text-xl font-black uppercase">英雄榜加载中...</span>
            </div>
          </div>
        }
      >
        <LeaderboardList sortBy={sortBy} />
      </Suspense>

      {/* 返回首页 */}
      <div className="mt-12 text-center">
        <NeoButton href="/" variant="primary" icon="fa-home">
          Back Home / 返回首页
        </NeoButton>
      </div>
    </div>
  )
}
