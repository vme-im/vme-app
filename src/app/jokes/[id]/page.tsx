import { Suspense } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  getAllKfcItems,
  getRandomKfcItem,
  getItemById,
  normalizeItemContent,
} from '@/lib/server-utils'
import Image from 'next/image'
import CopyButton from '@/components/shared/CopyButton'
import InteractiveReactions from '@/components/reactions/Interactive'
import NeoButton from '@/components/shared/NeoButton'
import Icon from '@/components/shared/Icon'
import { IKfcItem } from '@/types'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

function isIssueNumberParam(id: string) {
  return /^\d+$/.test(id)
}

async function fetchIssueByNumber(issueNumber: number): Promise<IKfcItem | null> {
  const owner = process.env.GITHUB_OWNER || 'vme-im'
  const repo = process.env.GITHUB_REPO || 'vme-content'

  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`,
      {
        headers: {
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'vme',
        },
        next: { revalidate: 60 },
      },
    )

    if (!response.ok) return null

    const issue = await response.json()

    if (!issue?.node_id || !issue?.user?.login) return null
    if (issue?.pull_request) return null

    const isApproved =
      Array.isArray(issue.labels) &&
      issue.labels.some((l: any) => (typeof l === 'string' ? l : l?.name) === '收录')

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
      _approved: isApproved,
    } as IKfcItem & { _approved: boolean }
  } catch {
    return null
  }
}

async function getJokeForParams(id: string): Promise<IKfcItem | null> {
  if (isIssueNumberParam(id)) {
    return fetchIssueByNumber(Number(id))
  }

  return await getItemById(id)
}

// 生成静态参数（可选，用于优化）
export async function generateStaticParams() {
  const items = await getAllKfcItems()
  // 只为前 100 个文案生成静态页面，其他的使用 ISR
  return items.slice(0, 100).map((item) => ({
    id: item.id,
  }))
}

// 生成页面元数据
export async function generateMetadata(props: PageProps) {
  const params = await props.params
  const joke = await getJokeForParams(params.id)

  if (!joke) {
    return {
      title: '文案不存在 - 疯狂星期四文案库',
      description: '这条文案可能被吃掉了，或者压根没存在过。',
    }
  }

  // 规范化内容，兼容 title 是正文的情况
  const normalizedJoke = normalizeItemContent(joke)

  // 使用文案标题作为页面标题
  const pageTitle = normalizedJoke.title
    ? `${normalizedJoke.title} - 疯狂星期四文案库`
    : '疯狂星期四文案 - KFC 文案库'

  // 生成描述：使用文案内容前 150 字符
  const description =
    normalizedJoke.body.length > 150
      ? normalizedJoke.body.slice(0, 150) + '...'
      : normalizedJoke.body

  // 生成关键词
  const keywords = `疯狂星期四,KFC文案,${normalizedJoke.author.username},搞笑文案,梗图`

  return {
    title: pageTitle,
    description,
    keywords,
    authors: [{ name: normalizedJoke.author.username, url: normalizedJoke.author.url }],
    openGraph: {
      title: normalizedJoke.title || '疯狂星期四文案',
      description,
      type: 'article',
      authors: [normalizedJoke.author.username],
      publishedTime: normalizedJoke.createdAt,
      modifiedTime: normalizedJoke.updatedAt,
    },
    twitter: {
      card: 'summary',
      title: normalizedJoke.title || '疯狂星期四文案',
      description,
      creator: `@${normalizedJoke.author.username}`,
    },
  }
}

export const revalidate = 3600 // 1小时重新验证一次

/** 报纸日期格式：YYYY 年 M 月 D 日 */
function formatDate(iso?: string): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default async function JokeDetailPage(props0: PageProps) {
  const params = await props0.params
  const joke = await getJokeForParams(params.id)

  if (!joke) {
    notFound()
  }

  // 规范化内容，兼容 title 是正文的情况
  const normalizedJoke = normalizeItemContent(joke)

  // 计算热门状态（≥10 赞给头版级「热」贴纸）
  const totalReactions = normalizedJoke.reactions?.totalCount || 0
  const isHot = totalReactions >= 10

  // 栏目眉：有 tags 走「专栏 · {首个tag}」，无则「本报讯」
  const columnTag = normalizedJoke.tags?.[0]
  const eyebrow = columnTag ? `专栏 · ${columnTag}` : '本报讯'

  // 大标题只在 title 与正文实质不同时出现（避免重复），否则让正文当主角
  const bodyText = normalizedJoke.body?.trim() || ''
  const titleText = normalizedJoke.title?.trim() || ''
  const showHeadline = !!titleText && titleText !== bodyText

  const username = normalizedJoke.author.username
  const authorHref = `/authors/${encodeURIComponent(username)}`

  // 获取随机文案用于"再来一条"
  const randomJoke = await getRandomKfcItem()
  const nextJokeUrl = randomJoke ? `/jokes/${randomJoke.id}` : '/jokes'

  return (
    <div className="container mx-auto px-4 py-8 md:py-10">
      <div className="mx-auto max-w-3xl">
        {/* 返回：纯文字栏目级链接 */}
        <Link
          href="/jokes"
          className="group text-news-gray hover:text-kfc-red mb-4 inline-flex min-h-[44px] items-center gap-2 text-sm font-bold transition-colors md:mb-6"
        >
          <Icon name="arrow-left" className="transition-transform group-hover:-translate-x-0.5" />
          返回文案库
        </Link>

        <article>
          {/* 栏目眉 + 头版级「热」贴纸 */}
          <div className="border-news-rule flex items-center justify-between gap-3 border-b pb-2">
            <div className="text-kfc-red text-xs font-black tracking-wide">{eyebrow}</div>
            {isHot && (
              <span className="bg-kfc-red shadow-neo-sm inline-flex rotate-2 items-center gap-1 border-2 border-black px-2.5 py-0.5 text-xs font-black text-white">
                <Icon name="fire" />
                本期热文
              </span>
            )}
          </div>

          {/* 大标题区（title 与正文不同才展示） */}
          {showHeadline && (
            <h1 className="mt-5 text-3xl leading-tight font-black tracking-tight text-black md:text-5xl">
              {titleText}
            </h1>
          )}

          {/* byline：文 / @作者 · 日期 · ♥数 */}
          <div className={showHeadline ? 'mt-4' : 'mt-5'}>
            <p className="text-news-gray text-xs">
              文 /{' '}
              <Link href={authorHref} className="text-kfc-black hover:text-kfc-red font-bold">
                @{username}
              </Link>
              {' · '}
              {formatDate(normalizedJoke.createdAt)}
              {' · ♥ '}
              {totalReactions}
            </p>
          </div>

          {/* 正文：文案内容是主角，大字号宽行距 */}
          <div className="border-news-rule mt-6 border-t pt-8 text-lg leading-relaxed text-black md:text-xl md:leading-loose">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ node, ...props }) => (
                  <p className="mb-5 wrap-break-word whitespace-pre-wrap last:mb-0" {...props} />
                ),
                img: ({ node, ...props }) => (
                  <span className="my-8 flex w-full justify-center">
                    <img
                      {...props}
                      className="shadow-neo max-h-[500px] w-auto max-w-full border-3 border-black md:max-h-[600px]"
                    />
                  </span>
                ),
                a: ({ node, ...props }) => (
                  <a
                    {...props}
                    className="text-kfc-red decoration-2 underline-offset-2 hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                ),
                ul: ({ node, ...props }) => <ul className="mb-5 list-disc pl-6" {...props} />,
                ol: ({ node, ...props }) => <ol className="mb-5 list-decimal pl-6" {...props} />,
                // 引言走衬线点缀 + 红色分栏线，不用中文斜体
                blockquote: ({ node, ...props }) => (
                  <blockquote
                    className="border-kfc-red text-news-gray font-serif-news my-6 border-l-4 pl-5"
                    {...props}
                  />
                ),
                code: ({ node, ...props }) => (
                  <code
                    className="rounded-sm bg-black/10 px-1.5 py-0.5 font-mono text-base"
                    {...props}
                  />
                ),
              }}
            >
              {normalizedJoke.body}
            </ReactMarkdown>
          </div>

          {/* 关键词 + 复制：文末一条横排 */}
          <div className="border-news-rule mt-8 flex flex-wrap items-center justify-between gap-4 border-t pt-5">
            {normalizedJoke.tags && normalizedJoke.tags.length > 0 ? (
              <div className="text-news-gray flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                <span className="font-bold">本期关键词</span>
                {normalizedJoke.tags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/jokes?tag=${encodeURIComponent(tag)}`}
                    className="hover:text-kfc-red inline-flex items-center py-1.5 font-bold text-black transition-colors"
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            ) : (
              <span />
            )}
            <CopyButton text={normalizedJoke.body} />
          </div>

          {/* 作者签名档：报纸「本文作者」式，头像 + 名字 + 主页链接 */}
          <div className="bg-kfc-cream shadow-neo mt-10 border-3 border-black p-4 md:p-5">
            <div className="text-kfc-red mb-3 text-xs font-black tracking-wide">本文作者</div>
            <div className="flex items-center gap-4">
              <Link
                href={authorHref}
                className="shadow-neo-sm block shrink-0 border-2 border-black bg-white p-1 transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-neo"
              >
                <Image
                  src={normalizedJoke.author.avatarUrl}
                  alt={`${username} 的头像`}
                  width={64}
                  height={64}
                  className="h-12 w-12 object-cover md:h-14 md:w-14"
                />
              </Link>
              <div className="min-w-0 flex-1">
                <Link
                  href={authorHref}
                  className="hover:text-kfc-red block wrap-anywhere text-lg font-black text-black transition-colors"
                >
                  @{username}
                </Link>
                <a
                  href={normalizedJoke.author.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-news-gray hover:text-kfc-red inline-flex items-center gap-1.5 text-xs font-bold transition-colors"
                >
                  <Icon name="github" />
                  GitHub 主页
                </a>
              </div>
            </div>
          </div>

          {/* 互动反馈：文末一条横排，不再单独立标题条大区块 */}
          <div className="border-news-rule mt-8 border-t pt-5">
            <div className="text-kfc-red mb-3 text-xs font-black tracking-wide">
              读者来信 · 表个态
            </div>
            <Suspense
              fallback={
                <div className="flex items-center gap-2 font-bold text-black">
                  <span className="animate-neo-blink">加载互动数据中...</span>
                </div>
              }
            >
              <InteractiveReactions issueId={normalizedJoke.id} className="flex-wrap gap-2" />
            </Suspense>
          </div>
        </article>

        {/* 底部动作 */}
        <div className="mt-12 flex flex-col gap-4 sm:flex-row sm:justify-center">
          <NeoButton href={nextJokeUrl} variant="secondary" size="lg" icon="arrow-right">
            再来一条
          </NeoButton>
          <NeoButton href="/jokes" variant="black" size="lg" icon="folder-open">
            返回文案库
          </NeoButton>
        </div>
      </div>
    </div>
  )
}
