'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

import { BrandLogo } from '@/components/branding/BrandLogo'
import { cn } from '@/lib/utils/cn'

interface HeaderNavItem {
  href: string
  label: string
}

interface HeaderActionLink {
  href: string
  label: string
  variant?: 'primary' | 'secondary'
}

interface HeaderProps {
  brandLabel: string
  navItems: readonly HeaderNavItem[]
  brandHref?: string
  ctaHref?: string
  ctaLabel?: string
  actionLinks?: readonly HeaderActionLink[]
  showBrandMark?: boolean
}

export function Header({
  brandLabel,
  navItems,
  brandHref = '/',
  ctaHref,
  ctaLabel,
  actionLinks,
  showBrandMark = false,
}: HeaderProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const drawerRef = useRef<HTMLDivElement | null>(null)
  const resolvedActionLinks =
    actionLinks && actionLinks.length
      ? actionLinks
      : ctaHref && ctaLabel
        ? [{ href: ctaHref, label: ctaLabel, variant: 'primary' as const }]
        : []

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 16)
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  useEffect(() => {
    if (!isOpen || !drawerRef.current) {
      return
    }

    const focusableElements = drawerRef.current.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled])',
    )
    const first = focusableElements[0]
    const last = focusableElements[focusableElements.length - 1]

    first?.focus()

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
        return
      }

      if (event.key !== 'Tab' || !first || !last) {
        return
      }

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeydown)
    return () => {
      document.removeEventListener('keydown', handleKeydown)
    }
  }, [isOpen])

  return (
    <header
      className={cn(
        'sticky top-0 z-50 border-b transition duration-300',
        isScrolled
          ? 'border-cream-200 bg-cream-50/85 backdrop-blur-xl'
          : 'border-transparent bg-transparent',
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 sm:px-10">
        <Link className="text-charcoal-900" href={brandHref}>
          {showBrandMark ? <BrandLogo label={brandLabel} /> : <span className="font-display text-xl">{brandLabel}</span>}
        </Link>

        <nav aria-label="Hauptnavigation" className="hidden items-center gap-6 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              className="text-sm font-medium text-charcoal-700 hover:text-gold-600"
              href={item.href}
            >
              {item.label}
            </Link>
          ))}
          {resolvedActionLinks.map((link) => (
            <Link
              key={`${link.href}-${link.label}`}
              className={cn(
                'inline-flex min-h-11 items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition',
                link.variant === 'secondary'
                  ? 'border border-gold-300 bg-white text-charcoal-800 hover:border-gold-500 hover:bg-cream-50'
                  : 'bg-gold-500 text-charcoal-900 shadow-gold hover:bg-gold-400',
              )}
              href={link.href}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <button
          aria-expanded={isOpen}
          aria-label="Navigation umschalten"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-cream-300 bg-white text-charcoal-900 md:hidden"
          type="button"
          onClick={() => setIsOpen((current) => !current)}
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <AnimatePresence>
        {isOpen ? (
          <motion.div
            ref={drawerRef}
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="border-t border-cream-200 bg-white px-6 py-5 shadow-elegant md:hidden"
          >
            <nav aria-label="Mobile Hauptnavigation" className="flex flex-col gap-3">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  className="rounded-2xl px-4 py-3 text-base font-medium text-charcoal-800 hover:bg-cream-100"
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              {resolvedActionLinks.map((link) => (
                <Link
                  key={`${link.href}-${link.label}-mobile`}
                  className={cn(
                    'inline-flex min-h-11 items-center justify-center rounded-full px-4 py-3 text-base font-semibold',
                    link.variant === 'secondary'
                      ? 'border border-gold-300 bg-white text-charcoal-800'
                      : 'bg-gold-500 text-charcoal-900',
                  )}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  )
}
