import { Suspense } from 'react'
import Link from 'next/link'
import JokesList from '@/components/jokes/List'
import NeoButton from '@/components/shared/NeoButton'

// 获取URL参数的类型定义
interface PageProps {
  searchParams: Promise<{
    page?: string
    type?: 'text' | 'meme'
  }>
}

export default async function JokesPage(props: PageProps) {
  const searchParams = await props.searchParams;
  // 从URL参数获取页码和类型
  const page = parseInt(searchParams.page || '1')
  const type = searchParams.type

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 页面标题 */}
      <div className="mb-12 text-center md:mb-16">
        <h1 className="mb-6 text-5xl font-black italic tracking-tighter text-black md:text-7xl">
          文案<span className="text-kfc-red underline decoration-4 underline-offset-4">总仓库</span>
        </h1>
        <div className="inline-block rotate-1 border-2 border-black bg-black px-6 py-2 shadow-neo-sm">
          <p className="font-bold uppercase text-white md:text-lg">
            ARCHIVE: 历年疯四文案大赏
          </p>
        </div>
      </div>

      {/* 类型切换 Tab */}
      <div className="mb-8 flex flex-wrap justify-center gap-2">
        <Link
          href="/jokes"
          className={`flex items-center gap-2 border-2 border-black px-4 py-2 font-bold uppercase shadow-neo-sm transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none ${
            !type
              ? 'bg-kfc-red text-white'
              : 'bg-white text-black hover:bg-black hover:text-white'
          }`}
        >
          <i className="fa fa-folder-open"></i>
          All / 全部
        </Link>
        <Link
          href="/jokes?type=text"
          className={`flex items-center gap-2 border-2 border-black px-4 py-2 font-bold uppercase shadow-neo-sm transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none ${
            type === 'text'
              ? 'bg-kfc-red text-white'
              : 'bg-white text-black hover:bg-black hover:text-white'
          }`}
        >
          <i className="fa fa-quote-left"></i>
          Texts / 文案
        </Link>
        <Link
          href="/jokes?type=meme"
          className={`flex items-center gap-2 border-2 border-black px-4 py-2 font-bold uppercase shadow-neo-sm transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none ${
            type === 'meme'
              ? 'bg-kfc-red text-white'
              : 'bg-white text-black hover:bg-black hover:text-white'
          }`}
        >
          <i className="fa fa-image"></i>
          Memes / 梗图
        </Link>
      </div>

      {/* 段子列表 */}
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
        <JokesList currentPage={page} type={type} />
      </Suspense>

      {/* 返回首页 */}
      <div className="mt-16 text-center">
        <NeoButton href="/" variant="secondary" icon="fa-home">
          Back Home / 返回首页
        </NeoButton>
      </div>
    </div>
  )
}
