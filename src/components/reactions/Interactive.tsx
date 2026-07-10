'use client'

import { useMemo } from 'react'
import { useSession } from 'next-auth/react'
import useSWR from 'swr'
import { ReactionGroup, ReactionNode } from '@/types'
import ReactionsUI from './UI'
import ReactionsLoading from './Loading'

interface InteractiveReactionsProps {
  issueId: string
  initialReactionDetails?: ReactionGroup[]
  initialReactionNodes?: ReactionNode[]
  className?: string
  /** compact（列表页默认）：只显示有数据的表情 + "+" 展开；full（详情页）：全量展示 */
  variant?: 'compact' | 'full'
}

// 获取 reactions 数据的 fetcher
const reactionsFetcher = async (url: string) => {
  const res = await fetch(url)

  if (res.ok) {
    const data = await res.json()
    return {
      totalCount: data.totalCount,
      details: data.details || [],
      nodes: data.nodes || [],
      warning: null,
    }
  } else {
    // 处理各种错误情况
    const errorData = await res.json().catch(() => ({}))

    let warning = null
    if (res.status === 429) {
      warning = 'API 调用频率限制，显示缓存数据'
    } else if (res.status === 503) {
      warning = 'GitHub 未配置，显示基础数据'
    }

    return {
      totalCount: 0,
      details: [],
      nodes: [],
      warning,
      ...(errorData.fallback || {}),
    }
  }
}

/**
 * 互动反应容器组件
 * 职责：管理数据获取、状态、用户会话
 */
export default function InteractiveReactions({
  issueId,
  initialReactionDetails = [],
  initialReactionNodes = [],
  className = '',
  variant = 'compact',
}: InteractiveReactionsProps) {
  const { data: session, status } = useSession()

  // 检查是否有初始数据（来自批量请求）
  const hasInitialData = initialReactionDetails.length > 0 || initialReactionNodes.length > 0

  // 使用 SWR 获取 reactions 数据
  // 策略：
  // 1. 列表页（有批量数据）：使用批量数据，不自动请求
  // 2. 详情页：无批量数据，自动请求
  const shouldAutoFetch = !hasInitialData

  const { data: liveData, mutate: refreshReactions } = useSWR(
    // 会话加载中不初始化 SWR；未登录可正常拉取（API 会回退到只读 token）
    status === 'loading' ? null : `/api/reactions/${issueId}`,
    reactionsFetcher,
    {
      // 列表页（有批量初始数据）：依赖批量层统一节奏，自身不轮询；
      // 详情页（无初始数据）：60s 自动刷新，与单条 API 的 max-age=60 对齐，避免空打 HTTP 缓存
      refreshInterval: hasInitialData ? 0 : 60_000,
      revalidateOnFocus: false,
      revalidateOnMount: shouldAutoFetch, // 只有在不等待批量且无数据时才自动请求
      errorRetryCount: 2,
      errorRetryInterval: 5000,
      keepPreviousData: true,
      // 使用初始数据作为 fallback
      fallbackData: hasInitialData
        ? {
            totalCount: initialReactionDetails.reduce((sum, r) => sum + r.users.totalCount, 0),
            details: initialReactionDetails,
            nodes: initialReactionNodes,
            warning: null,
          }
        : undefined,
    },
  )

  // 数据处理逻辑（依赖用提取出的 username 标量，与 React Compiler 的推断一致）
  const username = session?.user?.username
  const { reactionCounts, userReactionMap, reactionUsers, warning } = useMemo(() => {
    const reactionDetails = liveData?.details || []
    const reactionNodes = liveData?.nodes || []

    const counts = new Map<string, number>()
    const userReactionMap = new Map<string, string>()
    const users = new Map<string, string[]>()

    // 从reactionDetails获取计数
    reactionDetails.forEach((reaction: any) => {
      counts.set(reaction.content, reaction.users.totalCount)
    })

    // 从reactionNodes获取用户状态与操作人列表
    reactionNodes.forEach((reaction: any) => {
      if (username && reaction.user.login === username) {
        userReactionMap.set(reaction.content, reaction.id)
      }

      if (!users.has(reaction.content)) {
        users.set(reaction.content, [])
      }
      users.get(reaction.content)!.push(reaction.user.login)
    })

    return {
      reactionCounts: counts,
      userReactionMap,
      reactionUsers: users,
      warning: liveData?.warning || null,
    }
  }, [liveData, username])

  // 处理用户交互后的数据刷新
  const handleDataRefresh = () => {
    refreshReactions()
  }

  // 会话加载中 - 显示骨架
  if (status === 'loading') {
    return <ReactionsLoading className={className} />
  }

  // 未登录与已登录共用同一 UI；LikeButton 内部会拦截未登录点击并弹出登录对话框
  return (
    <ReactionsUI
      issueId={issueId}
      reactionCounts={reactionCounts}
      userReactionMap={userReactionMap}
      reactionUsers={reactionUsers}
      onDataRefresh={handleDataRefresh}
      className={className}
      warning={warning}
      variant={variant}
    />
  )
}
