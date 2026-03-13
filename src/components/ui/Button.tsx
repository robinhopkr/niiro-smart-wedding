'use client'

import { forwardRef } from 'react'

import { cn } from '@/lib/utils/cn'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-gold-500 text-charcoal-900 shadow-gold hover:bg-gold-400 focus-visible:outline-gold-500',
  secondary:
    'border border-gold-300 bg-white text-charcoal-800 hover:border-gold-500 hover:text-charcoal-900',
  ghost: 'bg-transparent text-charcoal-700 hover:bg-cream-100',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'min-h-10 px-4 py-2 text-sm',
  md: 'min-h-11 px-5 py-3 text-sm',
  lg: 'min-h-12 px-6 py-3 text-base',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    className,
    children,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled,
    ...props
  },
  ref,
) {
  const buttonClassName = cn(
    'inline-flex items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap transition duration-200 disabled:cursor-not-allowed disabled:opacity-60',
    variantClasses[variant],
    sizeClasses[size],
    className,
  )

  return (
    <button
      ref={ref}
      className={buttonClassName}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <span>Lädt...</span>
        </span>
      ) : (
        children
      )}
    </button>
  )
})
