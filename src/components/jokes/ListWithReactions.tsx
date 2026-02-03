'use client'

import { memo, useMemo } from 'react'
import clsx from 'clsx'
import { IKfcItem } from '@/types'
import JokeCard from './Card'
import { useBatchReactions } from '@/hooks/useBatchReactions'
import { useSession } from 'next-auth/react'

interface ListWithReactionsProps {
  items: IKfcItem[]
  showTags?: boolean // 是否显示标签
  layout?: 'list' | 'masonry' // 布局模式
}

/**
 * 段子列表(带批量反应数据注入)
 * 职责：批量获取所有段子的互动数据，并注入到各个卡片
 * 使用 memo 优化避免不必要的重渲染
 */
const ListWithReactions = memo(function ListWithReactions({
  items,
  showTags = false,
  layout = 'list',
}: ListWithReactionsProps) {
  const { status } = useSession()
  const isMasonry = layout === 'masonry'

  // 使用 useMemo 缓存 issueIds 计算
  const issueIds = useMemo(
    () => (status === 'authenticated' ? items.map((item) => item.id) : []),
    [status, items],
  )

  const { data, isLoading } = useBatchReactions(issueIds)

  // 使用 useMemo 缓存等待状态
  const waitForBatchData = useMemo(
    () => status === 'loading' || (status === 'authenticated' && isLoading),
    [status, isLoading],
  )

  return (
    <div
      className={clsx(
        isMasonry && 'border-3 border-black bg-kfc-cream bg-halftone p-3 shadow-neo-lg md:p-4',
      )}
    >
      <div
        className={clsx(
          isMasonry ? 'columns-1 gap-4 space-y-0 md:columns-2 lg:columns-3' : 'space-y-6',
        )}
      >
        {items.map((item) => {
          const reactionData = data[item.id]
          return (
            <JokeCard
              key={item.id}
              item={item}
              // 将批量获取的数据注入到卡片
              initialReactionDetails={reactionData?.details || []}
              initialReactionNodes={reactionData?.nodes || []}
              waitForBatchData={waitForBatchData}
              showTags={showTags}
              className={isMasonry ? 'mb-4 break-inside-avoid' : ''}
            />
          )
        })}
      </div>
    </div>
  )
})

export default ListWithReactions
