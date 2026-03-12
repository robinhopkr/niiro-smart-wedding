import { ArrowLeft } from 'lucide-react'

import { Header } from '@/components/layout/Header'
import { ActionLink } from '@/components/ui/ActionLink'
import type { AdminSessionRole } from '@/lib/auth/admin-session'
import type { WeddingConfig } from '@/types/wedding'

import { AdminHelpWidget } from './AdminHelpWidget'
import { AdminRouteNav } from './AdminRouteNav'

interface AdminDashboardShellProps {
  children: React.ReactNode
  config: WeddingConfig
  galleryHref: string | null
  guestInviteHref: string
  guestInviteUrl: string
  photographerHref: string | null
  sessionRole: AdminSessionRole
}

export function AdminDashboardShell({
  children,
  config,
  guestInviteHref,
  sessionRole,
}: AdminDashboardShellProps) {
  return (
    <main className="min-h-screen bg-cream-50">
      <Header
        brandHref="/admin/uebersicht"
        brandLabel={`${config.coupleLabel} · Paarbereich`}
        ctaHref={guestInviteHref}
        ctaLabel="Gästeseite öffnen"
        navItems={[]}
        showBrandMark
      />
      <AdminRouteNav sessionRole={sessionRole} />

      <div className="mx-auto max-w-6xl space-y-6 px-6 py-6 sm:px-10">
        {sessionRole === 'planner' ? (
          <div className="surface-card flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-eyebrow text-sage-700">Wedding Planner</p>
              <p className="mt-2 text-body-md text-charcoal-700">
                Ihr seid jetzt im selben Paarbereich wie das zugeordnete Brautpaar. Nur der private
                Fotobereich bleibt für euch ausgeblendet.
              </p>
            </div>
            <ActionLink href="/admin/hochzeiten" size="sm" variant="secondary">
              <ArrowLeft className="h-4 w-4" />
              Zur Planner-Startseite
            </ActionLink>
          </div>
        ) : null}

        <div className="min-w-0 space-y-6">{children}</div>
      </div>

      <AdminHelpWidget />
    </main>
  )
}
