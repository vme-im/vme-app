'use client'

import { memo } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

const sortOptions = [
  { key: 'score', label: '综合评分', icon: '🏆' },
  { key: 'interactions', label: '互动数', icon: '👍' },
  { key: 'posts', label: '段子数', icon: '📝' },
]

interface SortTabsProps {
  currentSort: string
}

/**
 * 排行榜排序标签组件
 * 使用 memo 优化性能
 */
const SortTabs = memo(function SortTabs({ currentSort }: SortTabsProps) {
  const searchParams = useSearchParams()

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-black uppercase text-black">排序:</span>
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
            className={`flex items-center gap-1.5 border-2 border-black px-3 py-1 text-sm font-black transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none ${
              isActive
                ? 'bg-kfc-red text-white shadow-neo-sm'
                : 'bg-white text-black shadow-neo-sm hover:bg-black hover:text-white'
            }`}
          >
            <span>{icon}</span>
            {label}
          </Link>
        )
      })}
    </div>
  )
})

export default SortTabs
