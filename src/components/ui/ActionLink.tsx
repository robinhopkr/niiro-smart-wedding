import Link from 'next/link'

import { cn } from '@/lib/utils/cn'

type ActionLinkVariant = 'primary' | 'secondary' | 'ghost'
type ActionLinkSize = 'sm' | 'md' | 'lg'

interface ActionLinkProps {
  href: string
  children: React.ReactNode
  className?: string
  variant?: ActionLinkVariant
  size?: ActionLinkSize
}

const variantClasses: Record<ActionLinkVariant, string> = {
  primary:
    'bg-gold-500 text-charcoal-900 shadow-gold hover:bg-gold-400 focus-visible:outline-gold-500',
  secondary:
    'border border-gold-300 bg-white text-charcoal-800 hover:border-gold-500 hover:text-charcoal-900',
  ghost: 'bg-transparent text-charcoal-700 hover:bg-cream-100',
}

const sizeClasses: Record<ActionLinkSize, string> = {
  sm: 'min-h-10 px-4 py-2 text-sm',
  md: 'min-h-11 px-5 py-3 text-sm',
  lg: 'min-h-12 px-6 py-3 text-base',
}

export function ActionLink({
  href,
  children,
  className,
  variant = 'primary',
  size = 'md',
}: ActionLinkProps) {
  return (
    <Link
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap transition duration-200',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      href={href}
    >
      {children}
    </Link>
  )
}
