'use client'

import { memo, useEffect, useState } from 'react'
import LikeButton from './LikeButton'
import ReactionsContainer from './Container'
import Icon from '@/components/shared/Icon'

// 可用的反应类型
const availableReactions = [
  { key: 'THUMBS_UP', emoji: '👍', label: '点赞' },
  { key: 'HEART', emoji: '❤️', label: '爱心' },
  { key: 'LAUGH', emoji: '😄', label: '大笑' },
  { key: 'HOORAY', emoji: '🎉', label: '庆祝' },
  { key: 'ROCKET', emoji: '🚀', label: '火箭' },
  { key: 'EYES', emoji: '👀', label: '眼睛' },
]

interface ReactionsUIProps {
  issueId: string
  reactionCounts: Map<string, number>
  userReactionMap: Map<string, string>
  reactionUsers: Map<string, string[]>
  onDataRefresh: () => void
  className?: string
  warning?: string | null
  /**
   * compact（列表页默认）：只显示有人点过/自己点过的表情，"+" 展开全部；
   * full（详情页）：互动区是主角，始终全量展示。
   */
  variant?: 'compact' | 'full'
}

/**
 * 互动反应 UI
 * 职责：按 variant 决定表情按钮的展示密度，并承接操作失败的内联提示
 */
const ReactionsUI = memo(function ReactionsUI({
  issueId,
  reactionCounts,
  userReactionMap,
  reactionUsers,
  onDataRefresh,
  className = '',
  warning,
  variant = 'compact',
}: ReactionsUIProps) {
  const [expanded, setExpanded] = useState(variant === 'full')
  // 操作失败的内联提示（替代 alert），几秒后自动消失
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    if (!actionError) return
    const t = setTimeout(() => setActionError(null), 5000)
    return () => clearTimeout(t)
  }, [actionError])

  const visibleReactions = availableReactions.filter(
    ({ key }) => expanded || (reactionCounts.get(key) || 0) > 0 || userReactionMap.has(key),
  )
  // 数据降级 warning 只在详情页（full）显示——列表页每张卡都挂黄条太吵；
  // 点击失败的 actionError 是用户刚发起的操作反馈，两种形态都要给
  const notice = actionError || (variant === 'full' ? warning : null)

  return (
    <>
      {notice && (
        <span className="bg-kfc-yellow shadow-neo-sm mb-2 inline-flex items-center gap-1 border-2 border-black px-2 py-0.5 text-xs font-black text-black">
          <Icon name="alert-triangle" className="h-[1em] w-[1em] shrink-0" />
          {notice}
        </span>
      )}
      <ReactionsContainer className={className}>
        {visibleReactions.map(({ key, emoji }) => (
          <LikeButton
            key={key}
            issueId={issueId}
            reaction={key}
            emoji={emoji}
            count={reactionCounts.get(key) || 0}
            isUserReacted={userReactionMap.has(key)}
            onDataRefresh={onDataRefresh}
            onError={setActionError}
            className="shrink-0"
            users={reactionUsers.get(key) || []}
          />
        ))}
        {!expanded && (
          <button
            onClick={() => setExpanded(true)}
            className="border-news-rule text-news-gray hover:text-kfc-black flex min-h-[44px] items-center gap-1 border-2 border-dashed px-2.5 text-xs font-bold transition-colors hover:border-black md:min-h-[30px]"
            aria-label="展开全部表情"
          >
            <Icon name="plus" className="h-[1em] w-[1em]" />
            {visibleReactions.length === 0 && <span>表个态</span>}
          </button>
        )}
      </ReactionsContainer>
    </>
  )
})

export default ReactionsUI
