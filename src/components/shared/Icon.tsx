import { SVGProps } from 'react'
import clsx from 'clsx'

/**
 * 站内图标名称枚举。
 * Font Awesome 4.7 已退役，这里是唯一的图标来源，新增图标名需同步补充下方 PATHS。
 */
export type IconName =
  | 'arrow-right'
  | 'arrow-left'
  | 'home'
  | 'trophy'
  | 'fire'
  | 'user'
  | 'users'
  | 'calendar'
  | 'tags'
  | 'heart'
  | 'copy'
  | 'check'
  | 'search'
  | 'github'
  | 'star'
  | 'refresh'
  | 'image'
  | 'quote'
  | 'folder-open'
  | 'spinner'
  | 'check-circle'
  | 'alert-triangle'
  | 'x-circle'
  | 'info'
  | 'book'
  | 'pencil'
  | 'chevron-left'
  | 'chevron-right'
  | 'x'
  | 'upload'
  | 'plus'

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName
  className?: string
}

// 每个图标是一组 24x24 viewBox 下的线条元素，风格对齐 lucide（stroke-based）
const PATHS: Record<IconName, React.ReactNode> = {
  'arrow-right': (
    <>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </>
  ),
  plus: (
    <>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </>
  ),
  'arrow-left': (
    <>
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </>
  ),
  home: (
    <>
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </>
  ),
  trophy: (
    <>
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4z" />
      <path d="M7 5H4a2 2 0 0 0 0 4h1" />
      <path d="M17 5h3a2 2 0 0 1 0 4h-1" />
      <path d="M12 14v3" />
      <path d="M8 21h8" />
      <path d="M10 21v-2a2 2 0 0 1 2-2 2 2 0 0 1 2 2v2" />
    </>
  ),
  fire: (
    <path d="M12 2c1 4-3 5-3 9a3 3 0 0 0 6 0c0-1-.5-2-1-3 2 1 3 3 3 5a5 5 0 0 1-10 0c0-4 3-6 3-9 1 1 2 2 2 3z" />
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 21c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5" />
      <path d="M16 8.5a3 3 0 1 0 0-6" />
      <path d="M22 21c0-2.9-1.9-5.3-4.5-6.2" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <line x1="16" y1="3" x2="16" y2="7" />
      <line x1="8" y1="3" x2="8" y2="7" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </>
  ),
  tags: (
    <>
      <path d="M12 3h6a2 2 0 0 1 2 2v6l-10 10-8-8L12 3z" />
      <circle cx="15" cy="8" r="1.5" />
    </>
  ),
  heart: (
    <path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9z" />
  ),
  copy: (
    <>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </>
  ),
  check: <polyline points="4 12 9 17 20 6" />,
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <line x1="21" y1="21" x2="15.5" y2="15.5" />
    </>
  ),
  // 品牌图标，用实心色块而非描边，覆盖父级 stroke 样式
  github: (
    <path
      fill="currentColor"
      stroke="none"
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
    />
  ),
  star: <polygon points="12 2 15 9 22 9.5 17 14.5 18.5 22 12 18 5.5 22 7 14.5 2 9.5 9 9 12 2" />,
  refresh: (
    <>
      <path d="M21 12a9 9 0 1 1-3-6.7" />
      <polyline points="21 3 21 9 15 9" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </>
  ),
  quote: (
    <>
      <path d="M7 10a3 3 0 0 0-3 3v4h4v-4H6a2 2 0 0 1 2-2V6a4 4 0 0 0-1 4z" />
      <path d="M17 10a3 3 0 0 0-3 3v4h4v-4h-2a2 2 0 0 1 2-2V6a4 4 0 0 0-1 4z" />
    </>
  ),
  'folder-open': (
    <>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v1H5" />
      <path d="M3 7v11a2 2 0 0 0 2 2h13.2a2 2 0 0 0 1.94-1.51L22 10H6.66a2 2 0 0 0-1.94 1.51L3 18" />
    </>
  ),
  // 加载指示器，配合 className="animate-spin" 使用
  spinner: (
    <>
      <line x1="12" y1="2" x2="12" y2="6" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
      <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
      <line x1="2" y1="12" x2="6" y2="12" />
      <line x1="18" y1="12" x2="22" y2="12" />
      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
      <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
    </>
  ),
  'check-circle': (
    <>
      <circle cx="12" cy="12" r="9" />
      <polyline points="8.5 12.5 11 15 16 9" />
    </>
  ),
  'alert-triangle': (
    <>
      <path d="M12 3 2 20h20L12 3z" />
      <line x1="12" y1="9" x2="12" y2="14" />
      <line x1="12" y1="17.5" x2="12" y2="17.51" />
    </>
  ),
  'x-circle': (
    <>
      <circle cx="12" cy="12" r="9" />
      <line x1="9" y1="9" x2="15" y2="15" />
      <line x1="15" y1="9" x2="9" y2="15" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="11" x2="12" y2="16" />
      <line x1="12" y1="7.5" x2="12" y2="7.51" />
    </>
  ),
  book: (
    <>
      <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5" />
      <path d="M4 19.5V4.5" />
      <path d="M20 19H6.5a2.5 2.5 0 0 0 0 5H20" />
    </>
  ),
  pencil: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </>
  ),
  'chevron-left': <polyline points="15 18 9 12 15 6" />,
  'chevron-right': <polyline points="9 18 15 12 9 6" />,
  x: (
    <>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </>
  ),
  upload: (
    <>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </>
  ),
}

/**
 * 内联 SVG 图标组件（替代已退役的 Font Awesome 4.7）
 * 默认尺寸随字号（h-[1em] w-[1em]），用 className 覆盖尺寸/颜色
 */
export default function Icon({ name, className, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={clsx('h-[1em] w-[1em] shrink-0', className)}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {PATHS[name]}
    </svg>
  )
}
