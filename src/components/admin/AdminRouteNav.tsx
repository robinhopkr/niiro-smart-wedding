'use client'

import {
  BriefcaseBusiness,
  ClipboardList,
  Eye,
  FilePenLine,
  LifeBuoy,
  Link2,
  LayoutDashboard,
  MessagesSquare,
  UsersRound,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ComponentType } from 'react'

import { ADMIN_DASHBOARD_NAV_ITEMS } from '@/lib/admin/navigation'
import type { AdminSessionRole } from '@/lib/auth/admin-session'
import { cn } from '@/lib/utils/cn'

const iconByHref: Record<string, ComponentType<{ className?: string }>> = {
  '/admin/hochzeiten': BriefcaseBusiness,
  '/admin/uebersicht': LayoutDashboard,
  '/admin/einrichtung': ClipboardList,
  '/admin/planung': UsersRound,
  '/admin/inhalte': FilePenLine,
  '/admin/zugaenge': Link2,
  '/admin/rsvps': MessagesSquare,
  '/admin/vorschau': Eye,
  '/admin/hilfe': LifeBuoy,
}

interface AdminRouteNavProps {
  sessionRole?: AdminSessionRole
}

export function AdminRouteNav({ sessionRole = 'couple' }: AdminRouteNavProps) {
  const pathname = usePathname()
  const showPlannerHome = sessionRole === 'planner'
  const navItems = showPlannerHome
    ? [{ href: '/admin/hochzeiten', label: 'Hochzeiten' }, ...ADMIN_DASHBOARD_NAV_ITEMS]
    : ADMIN_DASHBOARD_NAV_ITEMS

  return (
    <div className="sticky top-[4.55rem] z-40 border-y border-cream-200 bg-cream-50/92 backdrop-blur-xl sm:top-[5.1rem]">
      <div className="mx-auto flex max-w-6xl gap-3 overflow-x-auto px-6 py-3 sm:px-10">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = iconByHref[item.href] ?? LayoutDashboard

          return (
            <Link
              key={item.href}
              className={cn(
                'inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition',
                isActive
                  ? 'border-gold-500 bg-gold-500 text-charcoal-900 shadow-gold'
                  : 'border-cream-300 bg-white text-charcoal-700 hover:border-gold-300 hover:text-charcoal-900',
              )}
              href={item.href}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
