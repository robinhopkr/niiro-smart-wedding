import { GuestAccessCard } from '@/components/admin/GuestAccessCard'
import { LogoutButton } from '@/components/admin/LogoutButton'
import { RsvpStats } from '@/components/admin/RsvpStats'
import { ActionLink } from '@/components/ui/ActionLink'
import { Badge } from '@/components/ui/Badge'
import { ADMIN_DASHBOARD_NAV_ITEMS } from '@/lib/admin/navigation'
import { getProtectedAdminContext } from '@/lib/admin/dashboard'
import { APP_BRAND_NAME } from '@/lib/constants'
import { buildAdminSummary, getGalleryCollections, listRsvps } from '@/lib/supabase/repository'

export default async function AdminOverviewPage() {
  const { config, guestInviteHref, guestInviteUrl, supabase, user } =
    await getProtectedAdminContext()
  const [rsvps, galleryCollections] = await Promise.all([
    listRsvps(supabase, config),
    getGalleryCollections(supabase, config),
  ])
  const summary = buildAdminSummary(rsvps)
  const totalPhotos = galleryCollections.publicPhotos.length + galleryCollections.privatePhotos.length
  const roleLabel = user.role === 'planner' ? 'Wedding Planner' : 'Brautpaar'

  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <article className="surface-card px-6 py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-eyebrow text-gold-700">{APP_BRAND_NAME}</p>
              <h1 className="mt-3 font-display text-card text-charcoal-900">{config.coupleLabel}</h1>
              <p className="mt-3 text-body-md text-charcoal-600">
                Ihr arbeitet jetzt in einem klar gegliederten Paarbereich. Von hier aus startet ihr
                in Einrichtung, Planung, Inhalte, Zugänge, RSVP, Vorschau oder Hilfe.
              </p>
            </div>
            <LogoutButton label="Logout" variant="secondary" />
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Badge variant="neutral">{roleLabel}</Badge>
            <Badge variant="neutral">{config.guestCode ?? 'Ohne Gästecode'}</Badge>
            <Badge variant="neutral">{config.templateId}</Badge>
          </div>

          <div className="mt-5 rounded-[1.5rem] border border-gold-200 bg-gold-50 px-4 py-4">
            <p className="text-eyebrow text-gold-700">Start hier</p>
            <p className="mt-3 text-body-md text-charcoal-700">
              Der Fragebogen ist euer schnellster Einstieg. Für Feinschliff könnt ihr danach direkt
              in Inhalte, Zugänge, RSVP oder Planung wechseln.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <ActionLink href="/admin/einrichtung">Fragebogen öffnen</ActionLink>
              <ActionLink href="/admin/inhalte" variant="secondary">Inhalte bearbeiten</ActionLink>
            </div>
          </div>
        </article>

        <article className="surface-card px-6 py-6">
          <p className="text-eyebrow text-sage-700">Bereichsübersicht</p>
          <h2 className="mt-3 font-display text-card text-charcoal-900">Was findet ihr wo?</h2>
          <div className="mt-4 grid gap-3">
            {ADMIN_DASHBOARD_NAV_ITEMS.map((item) => (
              <div key={item.href} className="rounded-[1.35rem] border border-cream-200 bg-cream-50 px-4 py-4">
                <p className="font-semibold text-charcoal-900">{item.label}</p>
                <p className="mt-2 text-body-md text-charcoal-600">{item.description}</p>
              </div>
            ))}
          </div>
        </article>
      </div>

      <RsvpStats summary={summary} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <article className="surface-card px-6 py-6">
          <p className="text-eyebrow text-gold-700">Schnellzugriff</p>
          <h2 className="mt-3 font-display text-card text-charcoal-900">Wichtige nächste Schritte</h2>
          <div className="mt-5 flex flex-wrap gap-3">
            <ActionLink href="/admin/einrichtung">Fragebogen starten</ActionLink>
            <ActionLink href="/admin/planung" variant="secondary">Tischplan öffnen</ActionLink>
            <ActionLink href="/admin/vorschau" variant="secondary">Gästeseite prüfen</ActionLink>
            <ActionLink href="/admin/hilfe" variant="secondary">Assistent öffnen</ActionLink>
          </div>
        </article>

        <article className="surface-card px-6 py-6">
          <p className="text-eyebrow text-sage-700">Einladungslink</p>
          <h2 className="mt-3 font-display text-card text-charcoal-900">Teilen & prüfen</h2>
          <p className="mt-3 break-all text-body-md text-charcoal-600">{guestInviteUrl}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <ActionLink href={guestInviteHref} variant="secondary">Gästeseite öffnen</ActionLink>
            <ActionLink href="/admin/zugaenge" variant="secondary">Zugänge verwalten</ActionLink>
          </div>
        </article>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <article className="surface-card px-6 py-6">
          <p className="text-eyebrow text-gold-700">Hochzeit</p>
          <h2 className="mt-3 font-display text-card text-charcoal-900">{config.coupleLabel}</h2>
          <div className="mt-5 flex flex-wrap gap-2">
            <Badge variant="neutral">{config.guestCode ?? 'Ohne Gästecode'}</Badge>
            <Badge variant="neutral">{config.templateId}</Badge>
            <Badge variant="neutral">{config.fontPresetId}</Badge>
          </div>
        </article>

        <article className="surface-card px-6 py-6">
          <p className="text-eyebrow text-sage-700">Medien</p>
          <h2 className="mt-3 font-display text-card text-charcoal-900">{totalPhotos} Fotos</h2>
          <p className="mt-3 text-body-md text-charcoal-600">
            Öffentlich: {galleryCollections.publicPhotos.length} · Privat: {galleryCollections.privatePhotos.length}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <ActionLink href="/admin/zugaenge" variant="secondary">Galerie prüfen</ActionLink>
          </div>
        </article>

        <article className="surface-card px-6 py-6">
          <p className="text-eyebrow text-dusty-rose-700">Nächster sinnvoller Schritt</p>
          <h2 className="mt-3 font-display text-card text-charcoal-900">Empfohlene Reihenfolge</h2>
          <ol className="mt-4 space-y-3 text-body-md text-charcoal-700">
            <li>1. Fragebogen oder Inhalte ausfüllen</li>
            <li>2. Zugänge und QR-Code teilen</li>
            <li>3. RSVP prüfen</li>
            <li>4. RSVP-Gäste in den Tischplan synchronisieren</li>
          </ol>
        </article>
      </div>

      <GuestAccessCard
        inviteHref={guestInviteHref}
        inviteUrl={guestInviteUrl}
        guestCode={config.guestCode}
      />
    </div>
  )
}
