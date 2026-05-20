import { Suspense } from 'react'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import JokesList from '@/components/jokes/List'
import NeoButton from '@/components/shared/NeoButton'
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
      {/* 作者 Hero */}
      <div className="mx-auto mb-12 max-w-3xl">
        <div className="flex flex-col items-center gap-5 border-4 border-black bg-white p-6 text-center shadow-neo-xl md:flex-row md:text-left md:p-8">
          <div className="shrink-0 border-3 border-black p-1 shadow-neo">
            <Image
              src={avatarUrl}
              alt={`${username}的头像`}
              width={96}
              height={96}
              className="h-20 w-20 object-cover md:h-24 md:w-24"
            />
          </div>
          <div className="flex-1">
            <div className="mb-2 inline-block -rotate-1 border-2 border-black bg-kfc-yellow px-3 py-1 text-xs font-black uppercase shadow-neo-sm">
              文案鬼才 / Contributor
            </div>
            <h1 className="text-3xl font-black italic tracking-tighter text-black md:text-5xl">
              @{username}
            </h1>
            <p className="mt-2 font-bold text-gray-700">
              已收录 <span className="bg-kfc-red px-1 text-white">{total}</span> 篇疯四文案
            </p>
          </div>
          <a
            href={githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 border-2 border-black bg-white px-4 py-2 font-black uppercase text-black shadow-neo-sm transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:bg-black hover:text-white hover:shadow-none"
          >
            <i className="fa fa-github"></i> GitHub
          </a>
        </div>
      </div>

      {/* 该作者的文案列表（复用站点统一列表/卡片/分页） */}
      <Suspense
        fallback={
          <div className="flex h-64 items-center justify-center border-4 border-black bg-white p-8 shadow-neo">
            <div className="flex flex-col items-center gap-4 text-black">
              <i className="fa fa-spinner fa-spin text-4xl"></i>
              <span className="text-xl font-black uppercase">加载中...</span>
            </div>
          </div>
        }
      >
        <JokesList currentPage={page} author={username} />
      </Suspense>

      <div className="mt-16 text-center">
        <NeoButton href="/leaderboard" variant="secondary" icon="fa-trophy">
          英雄榜 / Leaderboard
        </NeoButton>
      </div>
    </div>
  )
}
