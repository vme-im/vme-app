import Link from 'next/link'
import clsx from 'clsx'

export function IconLink({
  children,
  className,
  compact = false,
  icon: Icon,
  ...props
}: React.ComponentPropsWithoutRef<typeof Link> & {
  compact?: boolean
  icon?: React.ComponentType<{ className?: string }>
}) {
  return (
    <Link
      {...props}
      className={clsx(
        className,
        'group relative isolate flex items-center border-2 border-black bg-white px-3 py-1.5 text-sm font-black uppercase text-black shadow-neo transition-all hover:-translate-y-0.5 hover:shadow-neo-md hover:bg-black hover:text-white',
        compact ? 'gap-x-1' : 'gap-x-2',
      )}
    >
      <span className="absolute inset-0 -z-10 bg-white opacity-0 transition group-hover:opacity-100" />
      {Icon && <Icon className="h-4 w-4 flex-none group-hover:text-white" />}
      <span className="self-baseline">{children}</span>
    </Link>
  )
}
