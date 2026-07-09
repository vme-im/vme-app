import Link from 'next/link'
import clsx from 'clsx'
import { ComponentPropsWithoutRef, ReactNode } from 'react'
import Icon, { IconName } from './Icon'

type NeoButtonVariant = 'primary' | 'secondary' | 'black' | 'ghost'
type NeoButtonSize = 'sm' | 'md' | 'lg'

interface NeoButtonProps extends ComponentPropsWithoutRef<'button'> {
  variant?: NeoButtonVariant
  size?: NeoButtonSize
  href?: string
  icon?: IconName // 内联 SVG 图标名，如 "home"
  children: ReactNode
  className?: string
  external?: boolean // For external links
}

export default function NeoButton({
  variant = 'primary',
  size = 'md',
  href,
  icon,
  children,
  className,
  external = false,
  ...props
}: NeoButtonProps) {
  // Base styles always applied
  const baseStyles =
    'group inline-flex items-center justify-center gap-2 border-3 border-black font-black uppercase transition-all shadow-neo hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-neo-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-neo'

  // Variant styles
  const variantStyles = {
    primary: 'bg-kfc-red text-white',
    secondary: 'bg-white text-black hover:bg-black hover:text-white',
    black: 'bg-black text-white',
    ghost:
      'bg-transparent border-none shadow-none hover:bg-kfc-cream hover:shadow-none hover:translate-x-0 hover:translate-y-0',
  }

  // Size styles
  const sizeStyles = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-xl',
  }

  // Combine all styles
  const buttonClasses = clsx(baseStyles, variantStyles[variant], sizeStyles[size], className)

  // Icon element
  const iconElement = icon ? (
    <Icon
      name={icon}
      className={clsx('transition-colors', variant === 'secondary' ? 'group-hover:text-white' : '')}
    />
  ) : null

  // Render as Link if href is provided
  if (href) {
    if (external) {
      return (
        <a href={href} className={buttonClasses} target="_blank" rel="noopener noreferrer">
          {iconElement}
          <span>{children}</span>
        </a>
      )
    }
    return (
      <Link href={href} className={buttonClasses}>
        {iconElement}
        <span>{children}</span>
      </Link>
    )
  }

  // Render as Button otherwise
  return (
    <button className={buttonClasses} {...props}>
      {iconElement}
      <span>{children}</span>
    </button>
  )
}
