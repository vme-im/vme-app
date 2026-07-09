'use client'

import { useState, useCallback, memo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import LoginButton from '@/components/shared/LoginButton'
import type { IssueInfo } from '@/lib/issue-number'

interface HeaderProps {
  contributorsCount: number
  /** 由服务端（layout）计算好的期数信息，避免客户端算日期造成水合不一致 */
  issue: IssueInfo
}

const NAV_LINKS = [
  { label: '首页', href: '/' },
  { label: '文案仓库', href: '/jokes' },
  { label: '英雄榜', href: '/leaderboard' },
  { label: '我要投稿', href: '/submit' },
  { label: '系统状态', href: '/status' },
]

function isActivePath(pathname: string | null, href: string): boolean {
  return pathname === href || (href !== '/' && !!pathname?.startsWith(href))
}

/**
 * Header —《疯狂星期四日报》报头
 * 结构：顶部日期栏（随滚动隐去）+ 报头刊名，随后是黑底导航横条（sticky）。
 * nav 作为 header 的兄弟节点，其 sticky 容器块为整个页面列，故可全程吸顶。
 */
const Header = memo(function Header({ contributorsCount, issue }: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  const toggleMobileMenu = useCallback(() => setIsMobileMenuOpen((prev) => !prev), [])
  const closeMobileMenu = useCallback(() => setIsMobileMenuOpen(false), [])

  return (
    <>
      <header className="safe-area-top safe-area-x bg-kfc-cream text-kfc-black">
        {/* 日期栏：报纸 dateline，滚动即隐去 */}
        <div className="border-b border-news-rule">
          <div className="text-news-gray container mx-auto flex items-center justify-between gap-3 px-4 py-1.5 font-serif-news text-2xs sm:text-xs">
            <span className="truncate">{issue.dateLine}</span>
            <div className="flex shrink-0 items-center gap-4">
              <span className={issue.isThursday ? 'text-kfc-red font-bold' : ''}>
                {issue.countdownLabel}
              </span>
              <span className="hidden items-center gap-1.5 sm:inline-flex">
                <span className="animate-neo-blink inline-block h-1.5 w-1.5 rounded-full bg-kfc-red" />
                <span className="text-kfc-black font-bold">{contributorsCount}</span> 位文案鬼才在线
              </span>
            </div>
          </div>
        </div>

        {/* 报头刊名 */}
        <div className="border-b-4 border-double border-black">
          <div className="container mx-auto px-4 py-5 text-center md:py-6">
            <p className="font-display text-news-gray text-2xs tracking-[0.4em] uppercase sm:text-xs sm:tracking-[0.5em]">
              Crazy Thursday News Portal
            </p>
            <Link href="/" className="mt-1.5 inline-block">
              <h1 className="text-3xl leading-none font-black tracking-tight text-black sm:text-5xl md:text-6xl">
                疯狂星期四<span className="text-kfc-red">日报</span>
              </h1>
            </Link>
            <p className="text-news-gray mt-2 text-xs font-medium sm:text-sm">一周只疯一天的日报</p>
          </div>
        </div>
      </header>

      {/* 导航横条：黑底白字，sticky */}
      <nav className="bg-kfc-black safe-area-x sticky top-0 z-50 border-b-4 border-black text-white">
        <div className="container mx-auto flex items-center justify-between px-4">
          {/* 左：移动端汉堡 + 精简刊名 */}
          <div className="flex flex-1 items-center gap-2 lg:flex-none">
            <button
              type="button"
              className="flex h-9 w-9 flex-col items-center justify-center gap-1 lg:hidden"
              onClick={toggleMobileMenu}
              aria-label="切换菜单"
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-menu"
            >
              <span
                className={`h-0.5 w-6 bg-white transition-transform ${isMobileMenuOpen ? 'translate-y-1.5 rotate-45' : ''}`}
              />
              <span
                className={`h-0.5 w-6 bg-white transition-opacity ${isMobileMenuOpen ? 'opacity-0' : ''}`}
              />
              <span
                className={`h-0.5 w-6 bg-white transition-transform ${isMobileMenuOpen ? '-translate-y-1.5 -rotate-45' : ''}`}
              />
            </button>
            <Link href="/" className="font-black tracking-tight lg:hidden">
              疯狂星期四<span className="text-kfc-yellow">日报</span>
            </Link>
          </div>

          {/* 中：桌面端导航 */}
          <div className="hidden items-stretch lg:flex">
            {NAV_LINKS.map((link) => {
              const active = isActivePath(pathname, link.href)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-3 text-sm font-black tracking-wide transition-colors ${
                    active ? 'bg-kfc-red text-white' : 'text-white hover:text-kfc-yellow'
                  }`}
                >
                  {link.label}
                </Link>
              )
            })}
          </div>

          {/* 右：登录 */}
          <div className="flex flex-1 justify-end lg:flex-none">
            <LoginButton />
          </div>
        </div>

        {/* 移动端下拉菜单：class 驱动动画（见 globals.css #mobile-menu），配合 prefers-reduced-motion 生效 */}
        <div
          id="mobile-menu"
          className={`bg-kfc-black border-t border-white/15 lg:hidden ${isMobileMenuOpen ? '' : 'hidden'}`}
        >
          <nav className="container mx-auto flex flex-col px-4 py-2">
            {NAV_LINKS.map((link) => {
              const active = isActivePath(pathname, link.href)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={closeMobileMenu}
                  className={`border-b border-white/10 px-2 py-3 text-sm font-black tracking-wide ${
                    active ? 'text-kfc-yellow' : 'text-white'
                  }`}
                >
                  {link.label}
                </Link>
              )
            })}
            <div className="text-news-gray px-2 py-3 font-serif-news text-xs">
              {issue.dateLine} · <span className="text-kfc-yellow">{contributorsCount}</span>{' '}
              位文案鬼才在线
            </div>
          </nav>
        </div>
      </nav>
    </>
  )
})

export default Header
