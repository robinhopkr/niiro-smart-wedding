import Link from 'next/link'

import { Header } from '@/components/layout/Header'
import { Badge } from '@/components/ui/Badge'
import { APP_BRAND_NAME } from '@/lib/constants'
import type { AdminSessionRole } from '@/lib/auth/admin-session'
import type { WeddingConfig } from '@/types/wedding'

import { AdminSidebarNav } from './AdminSidebarNav'
import { AdminHelpWidget } from './AdminHelpWidget'
import { LogoutButton } from './LogoutButton'

interface AdminDashboardShellProps {
  children: React.ReactNode
  config: WeddingConfig
  galleryHref: string | null
  guestInviteUrl: string
  photographerHref: string | null
  sessionRole: AdminSessionRole
}

export function AdminDashboardShell({
  children,
  config,
  galleryHref,
  guestInviteUrl,
  photographerHref,
  sessionRole,
}: AdminDashboardShellProps) {
  const roleLabel = sessionRole === 'planner' ? 'Wedding Planner' : 'Brautpaar'

  return (
    <main className="min-h-screen bg-cream-50">
      <Header
        brandHref="/admin/uebersicht"
        brandLabel={`${config.coupleLabel} · Paarbereich`}
        ctaHref="/einladung"
        ctaLabel="Gästeseite öffnen"
        navItems={[]}
        showBrandMark
      />

      <div className="mx-auto grid max-w-[1420px] gap-6 px-6 py-6 sm:px-10 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
          <div className="surface-card px-6 py-6">
            <p className="text-sm uppercase tracking-[0.18em] text-gold-700">{APP_BRAND_NAME}</p>
            <h1 className="mt-3 font-display text-card text-charcoal-900">{config.coupleLabel}</h1>
            <p className="mt-3 text-sm leading-7 text-charcoal-600">
              Jeder Bereich hat jetzt eine eigene Seite. So bleibt die Planung klarer, schneller und
              deutlich weniger überladen.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Badge variant="neutral">{roleLabel}</Badge>
              <Badge variant="neutral">{config.guestCode ?? 'Ohne Gästecode'}</Badge>
              <Badge variant="neutral">{config.templateId}</Badge>
            </div>
          </div>

          <AdminSidebarNav />

          <div className="surface-card space-y-4 px-6 py-6">
            <div>
              <p className="text-sm uppercase tracking-[0.18em] text-sage-700">Schnellzugriff</p>
              <h2 className="mt-3 font-display text-card text-charcoal-900">Wichtige Links</h2>
            </div>
            <div className="grid gap-3">
              <Link
                className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-gold-500 px-5 py-3 text-sm font-semibold text-charcoal-900 shadow-gold transition hover:bg-gold-400"
                href="/einladung"
              >
                Gästeseite
              </Link>
              {galleryHref ? (
                <Link
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-gold-300 bg-white px-5 py-3 text-sm font-semibold text-charcoal-800 transition hover:border-gold-500 hover:text-charcoal-900"
                  href={galleryHref}
                >
                  Galerie
                </Link>
              ) : null}
              {photographerHref ? (
                <Link
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-gold-300 bg-white px-5 py-3 text-sm font-semibold text-charcoal-800 transition hover:border-gold-500 hover:text-charcoal-900"
                  href={photographerHref}
                >
                  Fotograf
                </Link>
              ) : null}
            </div>
            <div className="rounded-[1.35rem] bg-cream-50 px-4 py-4 text-sm text-charcoal-600">
              <p className="font-semibold text-charcoal-900">Einladungslink</p>
              <p className="mt-2 break-all">{guestInviteUrl}</p>
            </div>
            <LogoutButton />
          </div>
        </aside>

        <div className="min-w-0 space-y-6">{children}</div>
      </div>

      <AdminHelpWidget />
    </main>
  )
}
