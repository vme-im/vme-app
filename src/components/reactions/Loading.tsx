'use client'

import ReactionsContainer from './Container'

interface ReactionsLoadingProps {
  className?: string
}

/**
 * 互动反应 - 加载状态UI
 */
export default function ReactionsLoading({ className = '' }: ReactionsLoadingProps) {
  return (
    <ReactionsContainer className={className}>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div
          key={i}
          className="border-news-rule bg-kfc-cream h-7 w-12 shrink-0 animate-pulse border-2"
        />
      ))}
    </ReactionsContainer>
  )
}
