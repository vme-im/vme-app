import { Suspense } from 'react'
import Link from 'next/link'
import JokesList from '@/components/jokes/List'
import NeoButton from '@/components/shared/NeoButton'
import Icon from '@/components/shared/Icon'

// 获取URL参数的类型定义
interface PageProps {
  searchParams: Promise<{
    page?: string
    type?: 'text' | 'meme'
    tag?: string
  }>
}

const TYPE_TABS: { label: string; type?: 'text' | 'meme' }[] = [
  { label: '全部' },
  { label: '文案', type: 'text' },
  { label: '梗图', type: 'meme' },
]

export default async function JokesPage(props: PageProps) {
  const searchParams = await props.searchParams
  // 从URL参数获取页码和类型
  const page = parseInt(searchParams.page || '1')
  const type = searchParams.type
  const tag = searchParams.tag
  const tagParam = tag ? `&tag=${encodeURIComponent(tag)}` : ''

  // 栏目眉下的过滤状态一行说明：当前分类 + tag（如有）
  const typeLabel = type === 'meme' ? '梗图' : type === 'text' ? '文案' : '全部收录'

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 栏目眉 + 当前过滤状态 */}
      <div className="mb-6 border-b-4 border-black pb-4">
        <div className="text-kfc-red text-xs font-black tracking-wide">栏目 · 文案仓库</div>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-black tracking-tight text-black md:text-3xl">
            {tag ? `#${tag}` : typeLabel}
          </h1>
          {tag && (
            <span className="bg-kfc-yellow shadow-neo-sm inline-block -rotate-1 border-2 border-black px-2 py-0.5 text-xs font-black text-black">
              标签专题
            </span>
          )}
        </div>
        <p className="text-news-gray mt-1 text-sm">
          当前显示：{typeLabel}
          {tag && <>· 标签 #{tag}</>}
        </p>
      </div>

      {/* 分类 tab：黑底，选中变黄 */}
      <div className="bg-kfc-black mb-8 inline-flex flex-wrap gap-1 p-1">
        {TYPE_TABS.map((tab) => {
          const active = type === tab.type
          const href = tab.type
            ? `/jokes?type=${tab.type}${tagParam}`
            : `/jokes${tag ? `?tag=${encodeURIComponent(tag)}` : ''}`
          return (
            <Link
              key={tab.label}
              href={href}
              className={`inline-flex min-h-[44px] items-center px-4 py-2 text-sm font-black tracking-wide transition-colors md:min-h-0 ${
                active ? 'bg-kfc-yellow text-black' : 'text-white hover:text-kfc-yellow'
              }`}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>

      {/* 文案列表 */}
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
        <JokesList currentPage={page} type={type} tag={tag} />
      </Suspense>

      {/* 返回首页 */}
      <div className="mt-16 text-center">
        <NeoButton href="/" variant="secondary" icon="home">
          返回首页
        </NeoButton>
      </div>
    </div>
  )
}
