import type { Metadata } from 'next'
import localFont from 'next/font/local'
import clsx from 'clsx'
import { Providers } from '@/app/providers'
import { VercelAnalytics } from '@/components/vercel-analytics'
import { Header, Footer } from '@/components/shared'
import { getUniqueContributorsCount } from '@/lib/server-utils'

import '@/app/globals.css'

const monaSans = localFont({
  src: '../fonts/Mona-Sans.var.woff2',
  display: 'swap',
  variable: '--font-mona-sans',
  weight: '200 900',
})

export const metadata: Metadata = {
  title: '肯德基疯狂星期四段子收集站 | 今天你v50了吗？',
  description:
    '肯德基疯狂星期四的精髓，不止于炸鸡，更在于每一个让你笑出腹肌的段子。收录最搞笑的疯狂星期四段子。',
  keywords: '肯德基,疯狂星期四,段子,v50,KFC,搞笑,文案',
  alternates: {
    types: {
      'application/rss+xml': `${process.env.NEXT_PUBLIC_SITE_URL}/feed.xml`,
    },
  },
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const contributorsCount = await getUniqueContributorsCount()

  return (
    <html
      lang="zh-CN"
      className={clsx('h-full antialiased', monaSans.variable)}
      suppressHydrationWarning
    >
      <head>
        <link
          href="https://cdn.jsdelivr.net/npm/font-awesome@4.7.0/css/font-awesome.min.css"
          rel="stylesheet"
        />
      </head>
      <body className="bg-transparent text-gray-900">
        <Providers>
          <div className="bg-kfc-newsprint" aria-hidden="true" />
          <div className="relative z-10 flex min-h-screen flex-col">
            <Header contributorsCount={contributorsCount} />

            {/* 主内容 */}
            <main className="flex flex-1 flex-col">{children}</main>

            {/* 页脚 */}
            <Footer />
          </div>
        </Providers>
        <VercelAnalytics />
      </body>
    </html>
  )
}
