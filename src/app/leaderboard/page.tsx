import { Suspense } from 'react'
import { headers } from 'next/headers'
import LeaderboardList from '@/components/leaderboard/List'
import NeoButton from '@/components/shared/NeoButton'
import SectionTitle from '@/components/shared/SectionTitle'

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
  void request

  return (
    <div className="container mx-auto px-4 py-8 md:py-10">
      {/* 页头：统一贴纸标题 + 大黑体 h1 + 粗黑底线 */}
      <div className="mb-10 border-b-4 border-black pb-5">
        <SectionTitle label="文案鬼才排行" />
        <div className="mt-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <h1 className="text-4xl leading-none font-black tracking-tight text-black sm:text-6xl">
            V50 <span className="text-kfc-red">英雄榜</span>
          </h1>
          <p className="text-news-gray mt-2 text-sm sm:mt-0">看谁的文案最能打</p>
        </div>
      </div>

      {/* 梗王排行榜 - 服务端渲染 */}
      <Suspense
        fallback={
          <div className="border-news-rule flex h-64 items-center justify-center border-y">
            <div className="flex flex-col items-center gap-3 text-black">
              <span className="animate-neo-blink text-kfc-red text-xs font-black tracking-wide">
                稍等
              </span>
              <span className="text-xl font-black">正在清点 V50…</span>
            </div>
          </div>
        }
      >
        <LeaderboardList sortBy={sortBy} />
      </Suspense>

      {/* 返回首页 */}
      <div className="mt-12 text-center">
        <NeoButton href="/" variant="primary" icon="home">
          返回首页
        </NeoButton>
      </div>
    </div>
  )
}
