'use client'

import { useState, useCallback, memo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import LoginButton from '@/components/shared/LoginButton'
import type { ThursdayInfo } from '@/lib/crazy-thursday'

interface HeaderProps {
  contributorsCount: number
  /** 由服务端（layout）计算好的倒计时信息，避免客户端算日期造成水合不一致 */
  thursday: ThursdayInfo
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
 * Header — 「疯狂星期四 VME50」站头（本页最响元素之一，仅次于首页头条）
 * 结构：站名（大黑体 + VME50 黄贴纸）+ slogan + 倒计时贴纸（疯四梗，常驻显眼位），
 * 随后是黑底导航横条（sticky）。nav 作为 header 的兄弟节点，其 sticky 容器块为整个页面列，
 * 故可全程吸顶。
 */
const Header = memo(function Header({ contributorsCount, thursday }: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  const toggleMobileMenu = useCallback(() => setIsMobileMenuOpen((prev) => !prev), [])
  const closeMobileMenu = useCallback(() => setIsMobileMenuOpen(false), [])

  return (
    <>
      <header className="safe-area-top safe-area-x bg-kfc-cream text-kfc-black">
        {/* 站头：站名 + slogan + 倒计时贴纸 */}
        <div className="border-b-4 border-black">
          <div className="container mx-auto px-4 py-5 text-center md:py-6">
            <Link href="/" className="inline-block">
              <h1 className="flex items-start justify-center gap-2 text-[2.5rem] leading-none font-black tracking-tight text-black sm:text-5xl md:text-6xl">
                疯狂星期四
                <span className="bg-kfc-yellow shadow-neo-sm font-display mt-1 inline-block rotate-3 border-2 border-black px-1.5 py-0.5 text-sm font-black tracking-normal sm:text-base md:text-lg">
                  VME50
                </span>
              </h1>
            </Link>
            <p className="text-news-gray mt-2 text-xs font-bold sm:text-sm">不疯狂不星期四</p>

            {/* 倒计时：疯四梗常驻。周四红底炸开，平日白底候场 */}
            <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
              <span
                className={`shadow-neo-sm inline-block border-2 border-black px-3 py-1 text-xs font-black sm:text-sm ${
                  thursday.isThursday ? 'bg-kfc-red -rotate-1 text-white' : 'bg-white text-black'
                }`}
              >
                {thursday.countdownLabel}
              </span>
              <span className="text-news-gray hidden items-center gap-1.5 text-xs sm:inline-flex">
                <span className="animate-neo-blink bg-kfc-red inline-block h-1.5 w-1.5 rounded-full" />
                <span className="text-kfc-black font-bold">{contributorsCount}</span> 位文案鬼才在线
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* 导航横条：黑底白字，sticky */}
      <nav className="bg-kfc-black safe-area-x sticky top-0 z-50 border-b-4 border-black text-white">
        <div className="container mx-auto flex min-h-[52px] items-center justify-between px-4 lg:min-h-0">
          {/* 左：移动端汉堡 + 精简站名 */}
          <div className="flex flex-1 items-center gap-1 lg:flex-none">
            <button
              type="button"
              className="-ml-2.5 flex h-11 w-11 flex-col items-center justify-center gap-1 lg:hidden"
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
              疯狂星期四 <span className="font-display text-kfc-yellow">VME50</span>
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
            <div className="text-news-gray px-2 py-3 text-xs font-bold">
              {thursday.countdownLabel} ·{' '}
              <span className="text-kfc-yellow">{contributorsCount}</span> 位文案鬼才在线
            </div>
          </nav>
        </div>
      </nav>
    </>
  )
})

export default Header
