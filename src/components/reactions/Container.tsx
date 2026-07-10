'use client'

import { ReactNode } from 'react'

interface ReactionsContainerProps {
  children: ReactNode
  className?: string
}

/**
 * 互动反应容器组件
 * 职责：提供统一布局；窄屏自然换行，不做横向滚动
 */
export default function ReactionsContainer({ children, className = '' }: ReactionsContainerProps) {
  return (
    <div className={`flex min-w-0 flex-wrap items-center gap-1.5 ${className}`}>{children}</div>
  )
}
