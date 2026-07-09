import Link from 'next/link'

const NAV_LINKS = [
  { label: '首页', href: '/' },
  { label: '文案仓库', href: '/jokes' },
  { label: '英雄榜', href: '/leaderboard' },
  { label: '我要投稿', href: '/submit' },
  { label: '系统状态', href: '/status' },
]

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-kfc-black safe-area-bottom safe-area-x border-t-4 border-black text-kfc-cream">
      <div className="container mx-auto px-4 py-8">
        {/* 报眉 + 导航：一行版权栏 */}
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <Link href="/" className="text-lg font-black tracking-tight text-white">
            疯狂星期四<span className="text-kfc-red">日报</span>
          </Link>
          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-bold">
            {NAV_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="hover:text-kfc-yellow text-kfc-cream/80 transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* 细规则线 */}
        <div className="border-news-gray/50 my-5 border-t" />

        {/* 版权 / 免责（此处允许双语） */}
        <div className="text-news-gray flex flex-col gap-1 text-2xs sm:flex-row sm:items-center sm:justify-between sm:text-xs">
          <p>© {currentYear} 疯狂星期四日报 · 网友自己写的 · 逢周四出刊</p>
          <p className="uppercase">Not affiliated with KFC. Just memes &amp; fun.</p>
        </div>
      </div>
    </footer>
  )
}
