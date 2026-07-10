'use client'

import { memo, useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { LikeRequest } from '@/types'
import { showLoginDialog } from '@/components/shared/LoginDialog'

interface LikeButtonProps {
  issueId: string
  reaction: string
  emoji: string
  count: number
  isUserReacted?: boolean
  className?: string
  onDataRefresh?: () => void
  /** 操作失败时上报给父级的内联提示（替代 alert） */
  onError?: (message: string) => void
  users?: string[]
}

/**
 * 表情反应按钮
 * 两态视觉：未点 = 安静灰底（hover 才出黑边），已点 = 黄底黑边贴纸感。
 * 点击立即乐观更新（本地 ±1 + 状态翻转），服务器数据回来后以 props 为准复位；失败回滚并内联报错。
 */
const LikeButton = memo(function LikeButton({
  issueId,
  reaction,
  emoji,
  count,
  isUserReacted = false,
  className = '',
  onDataRefresh,
  onError,
  users = [],
}: LikeButtonProps) {
  const { data: session } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  // 乐观覆盖：非 null 时以它为准展示；props（服务器数据）更新后自动复位
  const [optimistic, setOptimistic] = useState<{ delta: number; reacted: boolean } | null>(null)

  useEffect(() => {
    setOptimistic(null)
  }, [count, isUserReacted])

  const shownReacted = optimistic ? optimistic.reacted : isUserReacted
  const shownCount = Math.max(0, optimistic ? count + optimistic.delta : count)

  const handleReactionToggle = useCallback(async () => {
    if (!session?.user?.username) {
      showLoginDialog({
        title: '互动需要登录',
        message: '登录后才能点表情，也能上交自己的文案。',
      })
      return
    }

    if (isLoading) return

    // 先乐观翻转，让点击立刻有反馈
    setOptimistic({ delta: isUserReacted ? -1 : 1, reacted: !isUserReacted })
    setIsLoading(true)
    try {
      const method = isUserReacted ? 'DELETE' : 'POST'

      const response = await fetch('/api/like', {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          issueId,
          reaction,
        } as LikeRequest),
      })

      const data = await response.json()

      if (data.success) {
        onDataRefresh?.()
      } else {
        setOptimistic(null)
        if (response.status === 401) {
          const errorMsg = data.message || ''
          const isExpired = errorMsg.includes('无效') || errorMsg.includes('过期')

          showLoginDialog({
            title: isExpired ? '登录已过期' : '需要登录',
            message: isExpired ? '登录过期了，重新登录就能接着点' : '登录一下才能继续点表情',
          })
        } else {
          onError?.(data.message || '没点上，再试一次')
        }
      }
    } catch (error) {
      console.error('Reaction操作失败:', error)
      setOptimistic(null)
      onError?.('没点上，再试一次')
    } finally {
      setIsLoading(false)
    }
  }, [session, isUserReacted, isLoading, issueId, reaction, onDataRefresh, onError])

  const getTitle = useCallback(() => {
    if (users.length === 0) {
      return '还没人点'
    } else if (users.length <= 3) {
      return `${users.map((u) => `@${u}`).join('、')} 点了`
    }
    return `${users
      .slice(0, 3)
      .map((u) => `@${u}`)
      .join('、')} 等 ${users.length} 人点了`
  }, [users])

  return (
    <button
      onClick={handleReactionToggle}
      disabled={isLoading}
      className={`flex min-h-[44px] items-center gap-1 border-2 px-2.5 text-sm transition-colors md:min-h-[30px] ${
        shownReacted
          ? 'bg-kfc-yellow shadow-neo-sm border-black font-black text-black'
          : 'text-news-gray hover:text-kfc-black border-transparent bg-black/5 font-bold hover:border-black hover:bg-white'
      } ${isLoading ? 'cursor-wait opacity-60' : 'cursor-pointer'} ${className}`}
      title={getTitle()}
      aria-pressed={shownReacted}
    >
      <span className="text-base leading-none">{emoji}</span>
      {shownCount > 0 && <span className="tabular-nums">{shownCount}</span>}
    </button>
  )
})

export default LikeButton
