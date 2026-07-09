import { Suspense } from 'react'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import JokesList from '@/components/jokes/List'
import NeoButton from '@/components/shared/NeoButton'
import Icon from '@/components/shared/Icon'
import { getKfcItemsWithPagination } from '@/lib/server-utils'

interface PageProps {
  params: Promise<{ username: string }>
  searchParams: Promise<{ page?: string }>
}

export async function generateMetadata(props: PageProps) {
  const { username: raw } = await props.params
  const username = decodeURIComponent(raw)
  return {
    title: `@${username} 的疯四文案 - 疯狂星期四文案库`,
    description: `文案鬼才 @${username} 收录在疯狂星期四文案库的全部文案与梗图。`,
  }
}

export const revalidate = 3600

export default async function AuthorPage(props: PageProps) {
  const { username: raw } = await props.params
  const sp = await props.searchParams
  const username = decodeURIComponent(raw)
  const page = parseInt(sp.page || '1')

  // 该作者无收录则 404（快照里查不到此作者）
  const { items, total } = await getKfcItemsWithPagination(1, 10, undefined, undefined, username)
  if (total === 0) notFound()

  // 复用快照里已有的头像直链，避免依赖 github.com/{user}.png 的 302 redirect
  const avatarUrl = items[0].author.avatarUrl
  const githubUrl = items[0].author.url

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 记者档案：紧凑一行 */}
      <div className="mb-10 flex flex-wrap items-center gap-4 border-b-4 border-black pb-6">
        <div className="border-3 border-black shrink-0">
          <Image
            src={avatarUrl}
            alt={`${username}的头像`}
            width={64}
            height={64}
            className="h-16 w-16 object-cover"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-kfc-red text-xs font-black tracking-wide">记者档案</div>
          <h1 className="truncate text-2xl font-black tracking-tight text-black md:text-3xl">
            @{username}
          </h1>
          <p className="text-news-gray text-sm">
            已投稿 <span className="text-kfc-black font-bold">{total}</span> 篇文案
          </p>
        </div>
        <a
          href={githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shadow-neo-sm hover:shadow-neo-lg flex shrink-0 items-center gap-2 border-2 border-black bg-white px-4 py-2 text-sm font-black text-black transition-all hover:-translate-x-0.5 hover:-translate-y-0.5"
        >
          <Icon name="github" /> GitHub
        </a>
      </div>

      {/* 该作者的文案列表（复用站点统一列表/卡片/分页） */}
      <Suspense
        fallback={
          <div className="border-news-rule flex h-64 items-center justify-center border-y">
            <div className="text-news-gray flex flex-col items-center gap-3">
              <Icon name="spinner" className="animate-spin text-2xl" />
              <span className="text-sm font-bold">加载中...</span>
            </div>
          </div>
        }
      >
        <JokesList currentPage={page} author={username} />
      </Suspense>

      <div className="mt-16 text-center">
        <NeoButton href="/leaderboard" variant="secondary" icon="trophy">
          英雄榜
        </NeoButton>
      </div>
    </div>
  )
}
