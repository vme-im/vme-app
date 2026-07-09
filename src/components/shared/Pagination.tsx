'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import Icon from './Icon'

interface PaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  pageSize: number
  extraParams?: Record<string, string>
}

/**
 * 分页组件（报纸页码风格）
 * 「上一版 / 第 X 版 · 共 Y 版 / 下一版」，黑边按钮 + neo-sm 阴影
 */
export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  extraParams,
}: PaginationProps) {
  const searchParams = useSearchParams()

  if (totalPages <= 1) return null

  const buildUrl = (page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', page.toString())
    // 添加额外参数
    if (extraParams) {
      for (const [key, value] of Object.entries(extraParams)) {
        params.set(key, value)
      }
    }
    return `?${params.toString()}`
  }

  const navButtonClass =
    'flex min-h-[44px] items-center gap-1 border-2 border-black bg-white px-4 text-sm font-black text-black shadow-neo-sm transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-neo-lg'
  const navButtonDisabledClass =
    'flex min-h-[44px] cursor-not-allowed items-center gap-1 border-2 border-black bg-white/60 px-4 text-sm font-black text-news-gray opacity-50 shadow-neo-sm'

  return (
    <nav className="border-t-4 border-black pt-6" aria-label="分页">
      <div className="flex items-center justify-between gap-4">
        {currentPage > 1 ? (
          <Link scroll={false} href={buildUrl(currentPage - 1)} className={navButtonClass}>
            <Icon name="chevron-left" className="text-sm" />
            上一版
          </Link>
        ) : (
          <span className={navButtonDisabledClass}>
            <Icon name="chevron-left" className="text-sm" />
            上一版
          </span>
        )}

        <div className="text-news-gray text-center text-xs font-bold sm:text-sm">
          第 <span className="text-kfc-black font-black">{currentPage}</span> 版 · 共{' '}
          <span className="text-kfc-black font-black">{totalPages}</span> 版
          <span className="sr-only">
            （共 {totalItems} 篇，每版 {pageSize} 篇）
          </span>
        </div>

        {currentPage < totalPages ? (
          <Link scroll={false} href={buildUrl(currentPage + 1)} className={navButtonClass}>
            下一版
            <Icon name="chevron-right" className="text-sm" />
          </Link>
        ) : (
          <span className={navButtonDisabledClass}>
            下一版
            <Icon name="chevron-right" className="text-sm" />
          </span>
        )}
      </div>
    </nav>
  )
}
