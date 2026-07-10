import Link from 'next/link'
import NeoButton from '@/components/shared/NeoButton'
import SectionTitle from '@/components/shared/SectionTitle'
import type { TopTag } from '@/lib/data-access/types'

interface JokesSidebarProps {
  topTags: TopTag[]
}

/**
 * 侧栏（section 级）
 * 职责：宽屏（lg+）时贴在文章流右侧，提供「热门标签」与「投稿小卡」。
 * 中小屏隐去（hidden lg:block），不占窄屏正文宽度。
 * 纪律：section 级只用统一标题贴纸 + 内容；投稿小卡作为唯一的号召性色块。
 */
export default function JokesSidebar({ topTags }: JokesSidebarProps) {
  return (
    <aside className="hidden lg:sticky lg:top-24 lg:block lg:self-start">
      {/* 热门标签：纯排版列表 + 分隔线 */}
      {topTags.length > 0 && (
        <div>
          <SectionTitle label="热门标签" />
          <ul className="border-news-rule mt-4 border-t">
            {topTags.map((t) => (
              <li key={t.tag}>
                <Link
                  href={`/jokes?tag=${encodeURIComponent(t.tag)}`}
                  className="border-news-rule text-kfc-black hover:text-kfc-red flex items-center justify-between gap-3 border-b py-2.5 text-sm font-bold transition-colors"
                >
                  <span className="min-w-0 truncate">#{t.tag}</span>
                  <span className="text-news-gray font-display shrink-0">{t.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 投稿小卡：唯一的号召性色块 */}
      <div className="border-3 bg-kfc-cream mt-8 border-black p-5">
        <SectionTitle label="好活征集" />
        <p className="text-kfc-black mt-3 text-sm font-bold">有好活？上交一条，冲英雄榜。</p>
        <div className="mt-4">
          <NeoButton href="/submit" variant="primary" size="sm" icon="pencil">
            我要投稿
          </NeoButton>
        </div>
      </div>
    </aside>
  )
}
