'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { cn } from '@/lib/utils/cn'

interface AdminSectionNavItem {
  href: string
  label: string
}

interface AdminSectionNavProps {
  items: readonly AdminSectionNavItem[]
}

export function AdminSectionNav({ items }: AdminSectionNavProps) {
  const [activeHref, setActiveHref] = useState(items[0]?.href ?? '')

  useEffect(() => {
    const sectionIds = items
      .map((item) => item.href.replace(/^#/, ''))
      .filter(Boolean)

    const sections = sectionIds
      .map((id) => document.getElementById(id))
      .filter((section): section is HTMLElement => Boolean(section))

    if (!sections.length) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)

        const nextSectionId = visibleEntries[0]?.target.id
        if (nextSectionId) {
          setActiveHref(`#${nextSectionId}`)
        }
      },
      {
        rootMargin: '-25% 0px -55% 0px',
        threshold: [0.1, 0.25, 0.5],
      },
    )

    sections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [items])

  return (
    <div className="sticky top-[4.55rem] z-40 border-y border-cream-200 bg-cream-50/92 backdrop-blur-xl sm:top-[5.1rem]">
      <div className="mx-auto flex max-w-6xl gap-3 overflow-x-auto px-6 py-3 sm:px-10">
        {items.map((item) => {
          const isActive = item.href === activeHref

          return (
            <Link
              key={item.href}
              className={cn(
                'inline-flex min-h-11 shrink-0 items-center justify-center rounded-full border px-4 py-2 text-sm font-semibold transition',
                isActive
                  ? 'border-gold-500 bg-gold-500 text-charcoal-900 shadow-gold'
                  : 'border-cream-300 bg-white text-charcoal-700 hover:border-gold-300 hover:text-charcoal-900',
              )}
              href={item.href}
            >
              {item.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
