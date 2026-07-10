import Link from 'next/link'
import NeoButton from '@/components/shared/NeoButton'
import type { TopTag } from '@/lib/data-access/types'

interface JokesSidebarProps {
  topTags: TopTag[]
}

/**
 * 报纸侧栏（栏目级）
 * 职责：宽屏（lg+）时贴在文章流右侧，提供「版面导航（热门标签）」与「投稿小卡」。
 * 中小屏隐去（hidden lg:block），不占窄屏正文宽度。
 * 纪律：栏目级只用栏目眉 + 内容，不堆 emoji/旋转贴纸；投稿小卡作为唯一的号召性色块。
 */
export default function JokesSidebar({ topTags }: JokesSidebarProps) {
  return (
    <aside className="hidden lg:sticky lg:top-24 lg:block lg:self-start">
      {/* 版面导航：热门标签，纯排版列表 + 分栏线 */}
      {topTags.length > 0 && (
        <div>
          <div className="text-kfc-red text-xs font-black tracking-wide">版面 · 热门标签</div>
          <ul className="border-news-rule mt-3 border-t">
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

      {/* 投稿小卡：报纸「分类广告」式号召 */}
      <div className="border-3 border-black bg-kfc-cream mt-8 p-5">
        <div className="text-kfc-red text-xs font-black tracking-wide">投稿 · 疯人院</div>
        <p className="text-kfc-black mt-2 text-sm font-bold">有好活？上交一条，冲本周英雄榜。</p>
        <div className="mt-4">
          <NeoButton href="/submit" variant="primary" size="sm" icon="pencil">
            我要投稿
          </NeoButton>
        </div>
      </div>
    </aside>
  )
}
