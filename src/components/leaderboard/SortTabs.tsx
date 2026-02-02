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
const SortTabs = memo(function SortTabs({
  currentSort,
}: SortTabsProps) {
  const searchParams = useSearchParams()

  return (
    <div className="flex flex-wrap justify-center gap-3">
      <span className="flex items-center text-sm font-medium text-gray-600">
        排序方式:
      </span>
      {sortOptions.map(({ key, label, icon }) => {
        const isActive = currentSort === key

        // 直接生成 href 字符串,不需要额外优化
        const href = new URLSearchParams(searchParams.toString())
        href.set('sortBy', key)
        const hrefString = `?${href.toString()}`

        return (
          <Link
            key={key}
            scroll={false}
            href={hrefString}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${
              isActive
                ? 'bg-kfc-red text-white shadow-md'
                : 'bg-white text-gray-700 shadow-xs hover:bg-gray-50 hover:shadow-md'
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
