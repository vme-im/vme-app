import Image from 'next/image'
import Link from 'next/link'

const NAV_LINKS = [
  { label: '首页', href: '/' },
  { label: '文案库', href: '/jokes' },
  { label: '英雄榜', href: '/leaderboard' },
  { label: '我要投稿', href: '/submit' },
  { label: '状态', href: '/status' },
]

const RANDOM_FOOTER_QUOTES = [
  '"V ME 50 IS A LIFESTYLE"',
  '"疯狂星期四，人生的意义"',
  '"不疯狂，不星期四"',
  '"今天，你V了吗？"',
]

export default function Footer() {
  const currentYear = new Date().getFullYear()
  const quote = RANDOM_FOOTER_QUOTES[currentYear % RANDOM_FOOTER_QUOTES.length]

  return (
    <footer className="bg-kfc-red safe-area-bottom border-t-4 border-black text-white">
      <div className="safe-area-x container mx-auto px-4 py-8 md:py-12">
        {/* 主要内容区域 */}
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row md:gap-8">
          {/* Logo 和品牌 */}
          <div className="flex items-center gap-4">
            <div className="border-2 border-white bg-black p-1">
              <Image
                src="/images/logo.jpg"
                alt="KFC"
                width={50}
                height={50}
                className="h-10 w-10 object-cover md:h-12 md:w-12"
              />
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tighter text-white italic md:text-2xl">
                CRAZY THURSDAY
              </h3>
              <p className="text-xs font-bold tracking-widest text-white/70 uppercase">
                Official Meme Headquarters
              </p>
            </div>
          </div>

          {/* 导航链接 */}
          <nav className="flex flex-wrap items-center justify-center gap-4 text-xs font-bold tracking-wider uppercase md:gap-8 md:text-sm">
            {NAV_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="hover:border-kfc-yellow hover:text-kfc-yellow border-b-2 border-transparent transition-all"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* 分隔线 */}
        <div className="my-6 h-0.5 bg-white/20 md:my-8"></div>

        {/* 底部信息 */}
        <div className="flex flex-col items-center justify-between gap-4 text-center md:flex-row md:text-left md:text-sm">
          <div className="font-bold text-white/60 text-xs">
            <p>© {currentYear} 疯狂星期四文案大赏. All Rights Reserved.</p>
            <p className="mt-1 uppercase">
              Not affiliated with KFC Corporation. Just for fun &amp; memes.
            </p>
          </div>

          <div className="text-center md:text-right">
            <p className="text-kfc-yellow text-base font-black italic md:text-lg">
              &ldquo;{quote}&rdquo;
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
