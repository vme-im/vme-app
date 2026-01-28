'use client'

import { useState } from 'react'

interface CopyButtonProps {
  text: string
  className?: string
}

/**
 * 复制按钮组件
 */
export default function CopyButton({ text, className = '' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('复制失败:', err)
    }
  }

  return (
    <button
      onClick={handleCopy}
      className={`flex items-center gap-1 border-2 border-black bg-white px-3 py-1 text-xs font-bold text-black shadow-neo-sm transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none hover:bg-kfc-yellow ${className}`}
      title="复制文案"
    >
      {copied ? (
        <>
          <i className="fa fa-check text-kfc-red"></i>
          <span className="text-xs uppercase">COPIED!</span>
        </>
      ) : (
        <>
          <i className="fa fa-copy text-xs"></i>
          <span className="text-xs uppercase">COPY</span>
        </>
      )}
    </button>
  )
}

