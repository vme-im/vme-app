'use client'

import ReactionsContainer from './Container'

interface ReactionsLoadingProps {
  className?: string
}

/**
 * 互动反应 - 加载状态UI（与 compact 形态等高的两枚小骨架，不占一整行）
 */
export default function ReactionsLoading({ className = '' }: ReactionsLoadingProps) {
  return (
    <ReactionsContainer className={className}>
      {[1, 2].map((i) => (
        <div key={i} className="bg-kfc-black/5 h-[30px] w-14 shrink-0 animate-pulse" />
      ))}
    </ReactionsContainer>
  )
}
