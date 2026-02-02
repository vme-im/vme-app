'use client'

import { useEffect, useState } from 'react'

interface ClassifyTriggerProps {
  itemId: string
  silent?: boolean // 如果为 true，不显示任何 UI，仅触发后台任务
}

export default function ClassifyTrigger({ itemId, silent = false }: ClassifyTriggerProps) {
  const [hasTriggered, setHasTriggered] = useState(false)

  useEffect(() => {
    // 避免重复触发
    if (hasTriggered) return

    const triggerClassification = async () => {
      try {
        console.log(`[ClassifyTrigger] Triggering background classification for: ${itemId}`)

        // 触发后台分类任务（不等待结果）
        fetch('/api/classify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ itemId }),
        }).catch((error) => {
          console.warn('[ClassifyTrigger] Background classification request failed:', error)
        })

        setHasTriggered(true)
      } catch (error) {
        console.error('[ClassifyTrigger] Failed to trigger classification:', error)
      }
    }

    triggerClassification()
  }, [itemId, hasTriggered])

  // 如果是静默模式，不渲染任何内容
  if (silent) {
    return null
  }

  // 显示提示信息，告诉用户标签正在生成中
  return (
    <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-gray-500">
      <div className="flex items-center gap-2">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-kfc-red border-t-transparent"></div>
        <span>标签生成中...</span>
      </div>
    </div>
  )
}
