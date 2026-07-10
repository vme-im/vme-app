import Pagination from '@/components/shared/Pagination'
import { getKfcItemsWithPagination } from '@/lib/server-utils'
import ListWithReactions from './ListWithReactions'

interface JokesListProps {
  currentPage: number
  type?: 'text' | 'meme'
  tag?: string
  author?: string
}

/**
 * 文案列表容器（服务端组件）
 * 职责：获取分页数据，渲染列表结构（纯排版列表 + 分页）
 * 栏目眉/过滤状态说明由上层页面（jokes/authors 页）负责，本组件只管列表级内容
 */
export default async function JokesList({ currentPage, type, tag, author }: JokesListProps) {
  const { items, totalPages, total } = await getKfcItemsWithPagination(
    currentPage,
    10,
    type,
    tag,
    author,
  )

  // 文字列表限阅读列宽（报纸单栏），梗图瀑布流保持全宽多列
  const sectionWidth = type === 'meme' ? '' : 'max-w-3xl'

  if (items.length === 0) {
    return (
      <section id="jokes-list" className={`mb-12 ${sectionWidth}`}>
        <p className="text-news-gray border-news-rule border-y py-12 text-center text-sm">
          暂无收录，去上交一条文案吧。
        </p>
      </section>
    )
  }

  return (
    <section id="jokes-list" className={`mb-12 ${sectionWidth}`}>
      {/* 文案列表（含批量反应数据注入） */}
      <ListWithReactions
        items={items}
        showTags={true}
        layout={type === 'meme' ? 'masonry' : 'list'}
      />

      {/* 分页 */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={total}
        pageSize={10}
        extraParams={{
          ...(type ? { type } : {}),
          ...(tag ? { tag } : {}),
        }}
      />
    </section>
  )
}
