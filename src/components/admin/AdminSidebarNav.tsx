'use client'

import { Eye, FilePenLine, LifeBuoy, Link2, LayoutDashboard, MessagesSquare, UsersRound } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ComponentType } from 'react'

import { ADMIN_DASHBOARD_NAV_ITEMS } from '@/lib/admin/navigation'
import { cn } from '@/lib/utils/cn'

const iconByHref: Record<string, ComponentType<{ className?: string }>> = {
  '/admin/uebersicht': LayoutDashboard,
  '/admin/planung': UsersRound,
  '/admin/inhalte': FilePenLine,
  '/admin/zugaenge': Link2,
  '/admin/rsvps': MessagesSquare,
  '/admin/vorschau': Eye,
  '/admin/hilfe': LifeBuoy,
}

export function AdminSidebarNav() {
  const pathname = usePathname()

  return (
    <nav aria-label="Admin-Navigation" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
      {ADMIN_DASHBOARD_NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href
        const Icon = iconByHref[item.href] ?? LayoutDashboard

        return (
          <Link
            key={item.href}
            className={cn(
              'rounded-[1.6rem] border px-5 py-4 transition',
              isActive
                ? 'border-gold-500 bg-gold-50 shadow-elegant'
                : 'border-cream-200 bg-white hover:border-gold-300 hover:bg-cream-50',
            )}
            href={item.href}
          >
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full',
                  isActive ? 'bg-gold-500 text-charcoal-900 shadow-gold' : 'bg-cream-100 text-charcoal-700',
                )}
              >
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-charcoal-900">{item.label}</p>
                <p className="mt-1 text-sm leading-6 text-charcoal-600">{item.description}</p>
              </div>
            </div>
          </Link>
        )
      })}
    </nav>
  )
}
