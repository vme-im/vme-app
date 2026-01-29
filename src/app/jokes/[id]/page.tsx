import { Suspense } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth/next'
import { getAllKfcItems, getRandomKfcItem } from '@/lib/server-utils'
import { authOptions } from '@/lib/auth'
import { FormattedDate } from '@/components/shared/FormattedDate'
import Image from 'next/image'
import CopyButton from '@/components/shared/CopyButton'
import InteractiveReactions from '@/components/reactions/Interactive'
import NeoButton from '@/components/shared/NeoButton'
import { IKfcItem } from '@/types'


interface PageProps {
  params: {
    id: string
  }
}

function isIssueNumberParam(id: string) {
  return /^\d+$/.test(id)
}

async function fetchIssueByNumber(issueNumber: number): Promise<IKfcItem | null> {
  const owner = process.env.GITHUB_OWNER || 'zkl2333'
  const repo = process.env.GITHUB_REPO || 'vme'

  try {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`, {
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'vme',
      },
      next: { revalidate: 60 },
    })

    if (!response.ok) return null

    const issue = await response.json()

    if (!issue?.node_id || !issue?.user?.login) return null
    if (issue?.pull_request) return null

    return {
      id: issue.node_id,
      title: issue.title || '',
      url: issue.html_url || '',
      body: issue.body || '',
      createdAt: issue.created_at || new Date().toISOString(),
      updatedAt: issue.updated_at || issue.created_at || new Date().toISOString(),
      author: {
        username: issue.user.login,
        avatarUrl: issue.user.avatar_url,
        url: issue.user.html_url,
      },
      reactions: {
        totalCount: issue.reactions?.total_count || 0,
      },
    }
  } catch {
    return null
  }
}

async function getJokeForParams(id: string): Promise<IKfcItem | null> {
  if (isIssueNumberParam(id)) {
    return fetchIssueByNumber(Number(id))
  }

  const items = await getAllKfcItems()
  return items.find((item) => item.id === id) || null
}

// 生成静态参数（可选，用于优化）
export async function generateStaticParams() {
  const items = await getAllKfcItems()
  // 只为前 100 个段子生成静态页面，其他的使用 ISR
  return items.slice(0, 100).map((item) => ({
    id: item.id,
  }))
}

// 生成页面元数据
export async function generateMetadata({ params }: PageProps) {
  const joke = await getJokeForParams(params.id)

  if (!joke) {
    return {
      title: '段子不存在 - 疯狂星期四段子库',
      description: '抱歉，您访问的段子不存在或已被删除。',
    }
  }

  // 使用段子标题作为页面标题
  const pageTitle = joke.title
    ? `${joke.title} - 疯狂星期四段子库`
    : '疯狂星期四段子 - KFC 段子库'

  // 生成描述：使用段子内容前 150 字符
  const description = joke.body.length > 150
    ? joke.body.slice(0, 150) + '...'
    : joke.body

  // 生成关键词
  const keywords = `疯狂星期四,KFC段子,${joke.author.username},搞笑段子,文案`

  return {
    title: pageTitle,
    description,
    keywords,
    authors: [{ name: joke.author.username, url: joke.author.url }],
    openGraph: {
      title: joke.title || '疯狂星期四段子',
      description,
      type: 'article',
      authors: [joke.author.username],
      publishedTime: joke.createdAt,
      modifiedTime: joke.updatedAt,
    },
    twitter: {
      card: 'summary',
      title: joke.title || '疯狂星期四段子',
      description,
      creator: `@${joke.author.username}`,
    },
  }
}

export const revalidate = 3600 // 1小时重新验证一次

export default async function JokeDetailPage({ params }: PageProps) {
  const joke = await getJokeForParams(params.id)

  if (!joke) {
    notFound()
  }

  // 获取用户登录状态
  const session = await getServerSession(authOptions)
  const isAuthenticated = !!session?.user

  // 计算热门状态
  const totalReactions = joke.reactions?.totalCount || 0
  const isHot = totalReactions >= 10

  // 获取随机段子用于"再来一条"
  const randomJoke = await getRandomKfcItem()
  const nextJokeUrl = randomJoke ? `/jokes/${randomJoke.id}` : '/jokes'

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 返回按钮 */}
      <div className="mb-6">
        <a
          href="/jokes"
          className="group inline-flex items-center text-sm font-black uppercase text-gray-500 transition-colors duration-300 hover:text-kfc-red"
        >
          <i className="fa fa-arrow-left mr-2 transition-transform duration-300 group-hover:-translate-x-1"></i>
          <span>返回文案库</span>
        </a>
      </div>

      {/* 段子详情卡片 */}
      <div className="mx-auto max-w-4xl">
        <article className="relative border-4 border-black bg-white shadow-neo-xl">
          {/* 热门标签 */}
          {isHot && (
            <div className="absolute right-4 top-4 z-10 flex items-center gap-1.5 border-2 border-black bg-kfc-red px-3 py-1 text-xs font-black text-white shadow-neo-sm md:text-sm">
              <i className="fa fa-fire"></i>
              <span>热门</span>
            </div>
          )}

          <div className="relative z-10 p-5 md:p-8 lg:p-12">
            {/* 段子内容 */}
            <div className="mb-8 md:mb-12">
              <div className="mb-6 flex items-center gap-2 border-b-4 border-black pb-2">
                <span className="text-2xl md:text-3xl">📝</span>
                <h1 className="text-xl font-black italic text-black md:text-2xl">文案内容</h1>
              </div>

              <div className="group relative">
                <div className="min-h-[120px] border-3 border-black bg-kfc-cream p-6 text-xl font-medium leading-relaxed text-black shadow-neo transition-all hover:-translate-y-1 hover:shadow-neo-lg md:p-8 md:text-2xl lg:text-3xl">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({ node, ...props }) => <p className="mb-4 last:mb-0 break-words whitespace-pre-wrap" {...props} />,
                      img: ({ node, ...props }) => (
                        <span className="my-6 flex justify-center w-full">
                          <img
                            {...props}
                            className="max-h-[500px] w-auto max-w-full md:max-h-[600px]"
                          />
                        </span>
                      ),
                      a: ({ node, ...props }) => (
                        <a {...props} className="text-kfc-red hover:underline decoration-2 underline-offset-2" target="_blank" rel="noopener noreferrer" />
                      ),
                      ul: ({ node, ...props }) => <ul className="mb-4 list-disc pl-5" {...props} />,
                      ol: ({ node, ...props }) => <ol className="mb-4 list-decimal pl-5" {...props} />,
                      blockquote: ({ node, ...props }) => <blockquote className="my-4 border-l-4 border-black bg-white/50 p-4 italic" {...props} />,
                      code: ({ node, ...props }) => <code className="rounded bg-black/10 px-1 py-0.5 font-mono text-base" {...props} />,
                    }}
                  >
                    {joke.body}
                  </ReactMarkdown>
                </div>
                <div className="mt-4 flex justify-end">
                  <CopyButton text={joke.body} />
                </div>
              </div>
            </div>

            {/* 作者信息 */}
            <div className="mb-8">
              <div className="mb-4 flex items-center gap-2 border-b-4 border-black pb-2">
                <i className="fa fa-user text-xl text-kfc-red md:text-2xl"></i>
                <h2 className="text-xl font-black italic text-black md:text-2xl">文案鬼才</h2>
              </div>

              <div className="flex items-center gap-4 border-3 border-black bg-white p-4 shadow-neo">
                <div className="relative border-2 border-black p-1 shadow-neo-sm">
                  <Image
                    src={joke.author.avatarUrl}
                    alt={`${joke.author.username}的头像`}
                    width={64}
                    height={64}
                    className="h-12 w-12 object-cover md:h-16 md:w-16"
                  />
                </div>

                <div className="flex-1">
                  <div className="mb-1 text-lg font-black text-black md:text-xl">
                    @{joke.author.username}
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold uppercase text-gray-500 md:text-sm">
                    <i className="fa fa-calendar text-black"></i>
                    <span>发布于</span>
                    <FormattedDate date={joke.createdAt} />
                  </div>
                </div>
              </div>
            </div>

            {/* 互动区域 - 仅登录用户显示 */}
            {isAuthenticated && (
              <>
                <div className="mb-6">
                  <div className="mb-4 flex items-center gap-2 border-b-4 border-black pb-2">
                    <i className="fa fa-heart text-xl text-kfc-red md:text-2xl"></i>
                    <h2 className="text-xl font-black italic text-black md:text-2xl">互动反馈</h2>
                  </div>

                  <div className="border-3 border-black bg-gray-50 p-4 shadow-neo">
                    <Suspense
                      fallback={
                        <div className="flex items-center gap-2 text-gray-500">
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-kfc-red border-t-transparent"></div>
                          <span>加载互动数据中...</span>
                        </div>
                      }
                    >
                      <InteractiveReactions
                        issueId={joke.id}
                        className="flex-wrap gap-2"
                      />
                    </Suspense>
                  </div>
                </div>
              </>
            )}
          </div>
        </article>

        {/* 底部操作按钮 */}
        <div className="mt-8 flex flex-col gap-4 md:flex-row md:justify-center">
          <NeoButton href={nextJokeUrl} variant="secondary" size="lg" icon="fa-arrow-right">
            Next Joke / 再来一条
          </NeoButton>

          <NeoButton href="/" variant="black" size="lg" icon="fa-home">
            Back Home / 返回首页
          </NeoButton>
        </div>
      </div>
    </div>
  )
}

