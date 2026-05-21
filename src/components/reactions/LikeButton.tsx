'use client'

import { memo, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { signIn } from 'next-auth/react'
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
  users?: string[]
}

/**
 * 点赞按钮组件
 * 职责：处理单个反应的点击、显示和状态管理
 * 使用 memo 和 useCallback 优化性能
 */
const LikeButton = memo(function LikeButton({
  issueId,
  reaction,
  emoji,
  count,
  isUserReacted = false,
  className = '',
  onDataRefresh,
  users = [],
}: LikeButtonProps) {
  const { data: session } = useSession()
  const [isLoading, setIsLoading] = useState(false)

  // 使用 useCallback 缓存点击处理函数
  const handleReactionToggle = useCallback(async () => {
    if (!session?.user?.username) {
      // 显示登录确认弹窗
      showLoginDialog({
        title: '互动需要登录',
        message: '登录后才能点表情，也能上交自己的文案。',
      })
      return
    }

    if (isLoading) return

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
        // 通过回调函数刷新数据
        if (onDataRefresh) {
          onDataRefresh()
        }
      } else {
        // 如果是认证错误，重新登录
        if (response.status === 401) {
          const errorMsg = data.message || ''
          const isExpired = errorMsg.includes('无效') || errorMsg.includes('过期')

          showLoginDialog({
            title: isExpired ? '登录已过期' : '需要登录',
            message: isExpired ? '登录过期了，重新登录就能接着点' : '登录一下才能继续点表情',
          })
        } else {
          alert(data.message)
        }
      }
    } catch (error) {
      console.error('Reaction操作失败:', error)
      alert('操作失败，请稍后重试')
    } finally {
      setIsLoading(false)
    }
  }, [session, isUserReacted, isLoading, issueId, reaction, onDataRefresh])

  // 使用 useCallback 缓存标题生成函数
  const getTitle = useCallback(() => {
    if (users.length === 0) {
      return '暂无操作人'
    } else if (users.length === 1) {
      return `操作人: ${users[0]}`
    } else {
      return `操作人: ${users.slice(0, 3).join(', ')}${users.length > 3 ? ` 等${users.length}人` : ''}`
    }
  }, [users])

  return (
    <button
      onClick={handleReactionToggle}
      disabled={isLoading}
      className={`flex items-center gap-1 border-2 border-black px-2 py-0.5 text-sm font-bold transition-all ${
        isUserReacted
          ? 'bg-kfc-red text-white shadow-neo-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none'
          : 'bg-white text-black shadow-neo-sm hover:bg-black hover:text-white hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none'
      } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
      title={getTitle()}
    >
      <span className="text-base leading-none">{emoji}</span>
      <span className={isUserReacted ? 'font-black' : ''}>{count}</span>
      {isLoading && <span className="text-xs opacity-60">…</span>}
    </button>
  )
})

export default LikeButton
