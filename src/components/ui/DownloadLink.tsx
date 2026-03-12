import { cn } from '@/lib/utils/cn'

type DownloadLinkVariant = 'primary' | 'secondary' | 'ghost'
type DownloadLinkSize = 'sm' | 'md' | 'lg'

interface DownloadLinkProps {
  href: string
  children: React.ReactNode
  className?: string
  variant?: DownloadLinkVariant
  size?: DownloadLinkSize
}

const variantClasses: Record<DownloadLinkVariant, string> = {
  primary:
    'bg-gold-500 text-charcoal-900 shadow-gold hover:bg-gold-400 focus-visible:outline-gold-500',
  secondary:
    'border border-gold-300 bg-white text-charcoal-800 hover:border-gold-500 hover:text-charcoal-900',
  ghost: 'bg-transparent text-charcoal-700 hover:bg-cream-100',
}

const sizeClasses: Record<DownloadLinkSize, string> = {
  sm: 'min-h-10 px-4 py-2 text-sm',
  md: 'min-h-11 px-5 py-3 text-sm',
  lg: 'min-h-12 px-6 py-3 text-base',
}

export function DownloadLink({
  href,
  children,
  className,
  variant = 'secondary',
  size = 'md',
}: DownloadLinkProps) {
  return (
    <a
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition duration-200',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      href={href}
    >
      {children}
    </a>
  )
}
