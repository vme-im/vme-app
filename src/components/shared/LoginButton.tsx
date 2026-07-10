'use client'

import { useEffect, useRef, useState } from 'react'
import { signIn, signOut, useSession } from 'next-auth/react'
import Image from 'next/image'
import Link from 'next/link'
import Icon from '@/components/shared/Icon'

/**
 * 登录按钮 / 已登录用户菜单
 * 已登录时收敛为「头像 + 用户名 + 折角」触发器，登出与个人页入口收进下拉菜单，
 * 不再在导航条上放大块 LOG OUT 按钮。
 */
export default function LoginButton() {
  const { data: session, status } = useSession()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // 点击外部 / Esc 关闭菜单
  useEffect(() => {
    if (!menuOpen) return
    const onPointerDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  if (status === 'loading') {
    return (
      <div className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-2">
        <div className="border-kfc-yellow h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"></div>
        <span className="text-sm text-white">加载中...</span>
      </div>
    )
  }

  if (session) {
    const username = session.user?.username
    return (
      <div ref={menuRef} className="relative">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          className="flex min-h-[40px] items-center gap-1.5 px-1.5 py-1 text-white transition-colors hover:text-kfc-yellow lg:min-h-0"
        >
          <Image
            src={session.user?.image || '/default-avatar.png'}
            alt="用户头像"
            width={24}
            height={24}
            className="h-6 w-6 border border-white/40"
          />
          <span className="hidden max-w-[100px] truncate text-sm font-bold sm:inline">
            {username}
          </span>
          <Icon
            name="chevron-down"
            className={`h-3.5 w-3.5 transition-transform ${menuOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {menuOpen && (
          <div
            role="menu"
            className="shadow-neo absolute right-0 top-full z-50 mt-2 w-44 border-2 border-black bg-white py-1"
          >
            <div className="text-news-gray border-news-rule border-b px-4 py-2 text-xs">
              @{username}
            </div>
            {username && (
              <Link
                href={`/authors/${encodeURIComponent(username)}`}
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className="text-kfc-black hover:bg-kfc-cream hover:text-kfc-red block px-4 py-2.5 text-sm font-bold transition-colors"
              >
                我的文案
              </Link>
            )}
            <button
              role="menuitem"
              onClick={() => signOut()}
              className="text-kfc-black hover:bg-kfc-cream hover:text-kfc-red block w-full px-4 py-2.5 text-left text-sm font-bold transition-colors"
            >
              登出
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <button
      onClick={() => signIn('github')}
      className="bg-kfc-yellow shadow-neo-sm hover:shadow-neo flex min-h-[40px] items-center gap-2 border-2 border-black px-4 py-1.5 text-sm font-black text-black transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-white lg:min-h-0"
    >
      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fillRule="evenodd"
          d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
          clipRule="evenodd"
        />
      </svg>
      LOGIN / 登录
    </button>
  )
}
