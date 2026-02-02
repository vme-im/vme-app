'use client'

import { useEffect, useState } from 'react'

interface ClassifyTriggerProps {
  itemId: string
  initialTags?: string[]
}

export default function ClassifyTrigger({ itemId, initialTags = [] }: ClassifyTriggerProps) {
  const [tags, setTags] = useState<string[]>(initialTags)
  const [isLoading, setIsLoading] = useState(false)
  const [hasTriggered, setHasTriggered] = useState(false)

  useEffect(() => {
    // 如果已经有标签，或者已经触发过，就不再执行
    if (tags.length > 0 || hasTriggered) return

    const triggerClassification = async () => {
      setIsLoading(true)
      setHasTriggered(true)

      try {
        console.log(`[ClassifyTrigger] Triggering classification for: ${itemId}`)

        const response = await fetch('/api/classify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ itemId }),
        })

        if (response.ok) {
          const data = await response.json()
          if (data.success && data.tags && data.tags.length > 0) {
            console.log(`[ClassifyTrigger] Classification succeeded:`, data.tags)
            setTags(data.tags)
          } else {
            console.warn('[ClassifyTrigger] Classification returned no tags')
          }
        } else {
          console.warn('[ClassifyTrigger] Classification request failed:', response.status)
        }
      } catch (error) {
        console.error('[ClassifyTrigger] Classification error:', error)
      } finally {
        setIsLoading(false)
      }
    }

    triggerClassification()
  }, [itemId, tags, hasTriggered])

  // 加载中状态
  if (isLoading) {
    return (
      <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-gray-500">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-kfc-red border-t-transparent"></div>
          <span>标签生成中...</span>
        </div>
      </div>
    )
  }

  // 没有标签且不在加载中，不显示任何内容
  if (tags.length === 0) {
    return null
  }

  // 显示标签
  return (
    <div className="mt-6 flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2 border-2 border-black bg-white px-3 py-1 text-sm font-bold shadow-neo-sm">
        <i className="fa fa-tags text-kfc-red"></i>
        <span>标签</span>
      </div>
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-block border-2 border-black bg-kfc-yellow px-3 py-1 text-sm font-black text-black shadow-neo-sm transition-all hover:-translate-y-1 hover:shadow-neo cursor-default transform even:-rotate-1 odd:rotate-1"
        >
          #{tag}
        </span>
      ))}
    </div>
  )
}
