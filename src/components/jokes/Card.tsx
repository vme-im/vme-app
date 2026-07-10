'use client'

import { memo, useMemo, useRef, useState, useEffect } from 'react'
import clsx from 'clsx'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import CopyButton from '@/components/shared/CopyButton'
import InteractiveReactions from '@/components/reactions/Interactive'
import ReactionsLoading from '@/components/reactions/Loading'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { IKfcItem, ReactionGroup, ReactionNode } from '@/types'

interface JokeCardProps {
  item: IKfcItem
  initialReactionDetails?: ReactionGroup[]
  initialReactionNodes?: ReactionNode[]
  waitForBatchData?: boolean // 是否等待批量数据
  showTags?: boolean // 是否显示标签
  className?: string // 允许外部注入样式
}

function formatDate(iso?: string): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/** byline：文 / @作者 · 日期 · ♥数（格式统一见风格指南） */
function Byline({ item }: { item: IKfcItem }) {
  const username = item.author?.username || '匿名疯四人'
  return (
    <p className="text-news-gray relative z-10 text-xs">
      文 /{' '}
      {item.author?.username ? (
        <Link
          href={`/authors/${encodeURIComponent(username)}`}
          className="text-kfc-black hover:text-kfc-red font-bold"
        >
          @{username}
        </Link>
      ) : (
        <span className="text-kfc-black font-bold">@{username}</span>
      )}
      {' · '}
      {formatDate(item.createdAt)}
      {' · ♥ '}
      {item.reactions?.totalCount ?? 0}
    </p>
  )
}

/**
 * 文案条目组件（列表级）
 * 职责：展示单条文案的正文、byline 与互动数据
 * 纯排版：正文 + byline，分栏线分隔，无卡片边框/阴影/旋转/emoji 背景
 * 使用 memo 优化避免不必要的重渲染
 */
const JokeCard = memo(function JokeCard({
  item,
  initialReactionDetails = [],
  initialReactionNodes = [],
  waitForBatchData = false,
  showTags = false,
  className = '',
}: JokeCardProps) {
  const searchParams = useSearchParams()
  const currentType = searchParams.get('type')
  const contentRef = useRef<HTMLDivElement>(null)
  const [isOverflowing, setIsOverflowing] = useState(false)

  // 检测内容是否包含图片
  const hasImage = useMemo(() => {
    return item.body.includes('![') || item.body.includes('<img')
  }, [item.body])

  // 检测内容是否溢出
  useEffect(() => {
    if (contentRef.current && !hasImage) {
      const { scrollHeight, clientHeight } = contentRef.current
      setIsOverflowing(scrollHeight > clientHeight)
    }
  }, [item.body, hasImage])

  return (
    <article
      className={clsx(
        'group border-news-rule relative border-b py-5 transition-colors hover:bg-white',
        className,
      )}
    >
      {/* 标签：小号文字标签，hover 变红可点击过滤 */}
      {showTags && item.tags && item.tags.length > 0 && (
        <div className="relative z-10 mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          {item.tags.map((tag) => {
            const nextParams = new URLSearchParams()
            nextParams.set('tag', tag)
            if (currentType) {
              nextParams.set('type', currentType)
            }
            return (
              <Link
                key={tag}
                href={`/jokes?${nextParams.toString()}`}
                className="text-news-gray hover:text-kfc-red relative z-10 inline-flex items-center py-1 text-xs font-bold"
              >
                #{tag}
              </Link>
            )
          })}
        </div>
      )}

      {/* 正文 */}
      <div className="relative">
        <div
          ref={contentRef}
          className={clsx(
            'prose prose-p:my-1 prose-img:my-0 group-hover:text-kfc-red wrap-anywhere text-black transition-colors prose-p:leading-snug prose-headings:font-black prose-p:font-bold prose-a:text-kfc-red prose-blockquote:border-l-4 prose-blockquote:border-black prose-blockquote:bg-kfc-cream prose-blockquote:py-1 prose-blockquote:pl-2',
            !hasImage && 'max-h-48 overflow-hidden',
          )}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              img: ({ node, src, alt, ...props }: any) => {
                if (!src) return null
                return (
                  <div className="border-news-rule bg-kfc-cream relative my-2 h-64 w-full overflow-hidden border">
                    <Image
                      src={src}
                      alt={alt || 'Meme'}
                      fill
                      className="object-contain p-2"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  </div>
                )
              },
              p: ({ node, children, ...props }: any) => {
                // 检查子元素是否包含块级元素（如 img 转换后的 div）
                const hasBlockChild = node?.children?.some((child: any) => child.tagName === 'img')
                // 如果包含块级元素，使用 div 代替 p 避免 hydration error
                if (hasBlockChild) {
                  return (
                    <div
                      className="whitespace-pre-wrap text-justify-cn text-base md:text-lg"
                      {...props}
                    >
                      {children}
                    </div>
                  )
                }
                return (
                  <p
                    className={clsx(
                      'whitespace-pre-wrap text-justify-cn text-base md:text-lg',
                      !hasImage && 'line-clamp-6',
                    )}
                    {...props}
                  >
                    {children}
                  </p>
                )
              },
            }}
          >
            {item.body}
          </ReactMarkdown>
        </div>
        {/* 渐变遮罩 - 仅当内容溢出时显示 */}
        {!hasImage && isOverflowing && (
          <div className="from-kfc-cream group-hover:from-white pointer-events-none absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t to-transparent transition-colors" />
        )}
      </div>

      {/* 整条目可点击跳详情页：置于内容之后、byline 之前，byline/标签/复制按钮用 z-10 保持可点 */}
      <Link
        href={`/jokes/${item.id}`}
        className="focus-visible:outline-kfc-red absolute inset-0 z-0 focus-visible:outline focus-visible:outline-2"
        aria-label="查看详情"
      />

      {/* byline + 操作 */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <Byline item={item} />
        <div className="relative z-10">
          <CopyButton text={item.body} />
        </div>
      </div>

      {/* 互动数据展示 */}
      <div className="relative z-10 mt-2 min-w-0 overflow-hidden">
        {waitForBatchData ? (
          <ReactionsLoading />
        ) : (
          <InteractiveReactions
            issueId={item.id}
            initialReactionDetails={initialReactionDetails}
            initialReactionNodes={initialReactionNodes}
          />
        )}
      </div>
    </article>
  )
})

export default JokeCard
