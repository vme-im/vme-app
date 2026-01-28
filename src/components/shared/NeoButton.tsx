import Link from 'next/link'
import clsx from 'clsx'
import { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react'

type NeoButtonVariant = 'primary' | 'secondary' | 'black' | 'ghost'
type NeoButtonSize = 'sm' | 'md' | 'lg'

interface NeoButtonProps extends ComponentPropsWithoutRef<'button'> {
    variant?: NeoButtonVariant
    size?: NeoButtonSize
    href?: string
    icon?: string // FontAwesome icon class, e.g., "fa-home"
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
        'group inline-flex items-center justify-center gap-2 border-3 border-black font-black uppercase transition-all shadow-neo hover:-translate-y-1 hover:shadow-neo-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-neo'

    // Variant styles
    const variantStyles = {
        primary: 'bg-kfc-red text-white',
        secondary: 'bg-white text-black hover:bg-black hover:text-white',
        black: 'bg-black text-white hover:bg-gray-900',
        ghost: 'bg-transparent border-none shadow-none hover:bg-gray-100 hover:shadow-none hover:translate-y-0',
    }

    // Size styles
    const sizeStyles = {
        sm: 'px-4 py-2 text-sm',
        md: 'px-6 py-3 text-base',
        lg: 'px-8 py-4 text-xl',
    }

    // Combine all styles
    const buttonClasses = clsx(
        baseStyles,
        variantStyles[variant],
        sizeStyles[size],
        className
    )

    // Icon element
    const iconElement = icon ? (
        <i className={clsx('fa', icon, 'transition-colors', variant === 'secondary' ? 'group-hover:text-white' : '')}></i>
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
