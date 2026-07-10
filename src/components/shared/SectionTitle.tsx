import Link from 'next/link'

interface SectionTitleProps {
  /** 标题贴纸文字（section 名） */
  label: string
  /** 可选的右侧动作链接，如「全部文案 →」 */
  action?: { label: string; href: string }
  /** 可选的右侧自定义内容（与 action 互斥优先渲染 action） */
  children?: React.ReactNode
  className?: string
}

/**
 * SectionTitle — 全站唯一的 section 标题格式（响度：次响）
 * 黄底黑边贴纸 + 微旋转 + 硬阴影；右侧可挂一个纯文字动作链接或自定义内容。
 * 所有页面的 section 标题一律用它，不再各自发明标题条。
 */
export default function SectionTitle({ label, action, children, className }: SectionTitleProps) {
  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 ${className ?? ''}`}>
      <span className="bg-kfc-yellow shadow-neo-sm inline-block -rotate-1 border-2 border-black px-2.5 py-1 text-xs font-black tracking-wide text-black">
        {label}
      </span>
      {action ? (
        <Link
          href={action.href}
          className="text-news-gray hover:text-kfc-red inline-flex min-h-[44px] shrink-0 items-center text-xs font-bold md:min-h-0"
        >
          {action.label} →
        </Link>
      ) : (
        children
      )}
    </div>
  )
}
