'use client'

import { memo } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import Icon, { IconName } from '@/components/shared/Icon'

const sortOptions: { key: string; label: string; icon: IconName }[] = [
  { key: 'score', label: 'V50 指数', icon: 'trophy' },
  { key: 'interactions', label: '互动数', icon: 'heart' },
  { key: 'posts', label: '文案数', icon: 'pencil' },
]

interface SortTabsProps {
  currentSort: string
}

/**
 * 英雄榜排序标签
 * 新语言：黑底黄字（当前）/ 白底黑字 hover 黄底，按压感 hover 与站内按钮一致
 * 使用 memo 优化性能
 */
const SortTabs = memo(function SortTabs({ currentSort }: SortTabsProps) {
  const searchParams = useSearchParams()

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-news-gray text-xs font-bold">排序</span>
      {sortOptions.map(({ key, label, icon }) => {
        const isActive = currentSort === key

        const href = new URLSearchParams(searchParams.toString())
        href.set('sortBy', key)
        const hrefString = `?${href.toString()}`

        return (
          <Link
            key={key}
            scroll={false}
            href={hrefString}
            className={`shadow-neo-sm flex min-h-[44px] items-center gap-1.5 border-2 border-black px-3 py-1 text-sm font-black transition-all hover:translate-x-px hover:translate-y-px hover:shadow-none md:min-h-0 ${
              isActive ? 'bg-kfc-black text-kfc-yellow' : 'hover:bg-kfc-yellow bg-white text-black'
            }`}
          >
            <Icon name={icon} />
            {label}
          </Link>
        )
      })}
    </div>
  )
})

export default SortTabs
