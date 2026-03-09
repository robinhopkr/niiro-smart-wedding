import Link from 'next/link'

import { AdminPageHero } from '@/components/admin/AdminPageHero'
import { GuestAccessCard } from '@/components/admin/GuestAccessCard'
import { RsvpStats } from '@/components/admin/RsvpStats'
import { ActionLink } from '@/components/ui/ActionLink'
import { Badge } from '@/components/ui/Badge'
import { getProtectedAdminContext } from '@/lib/admin/dashboard'
import { buildAdminSummary, getGalleryCollections, listRsvps } from '@/lib/supabase/repository'

export default async function AdminOverviewPage() {
  const { config, guestInviteUrl, galleryHref, photographerHref, supabase } =
    await getProtectedAdminContext()
  const [rsvps, galleryCollections] = await Promise.all([
    listRsvps(supabase, config),
    getGalleryCollections(supabase, config),
  ])
  const summary = buildAdminSummary(rsvps)
  const totalPhotos = galleryCollections.publicPhotos.length + galleryCollections.privatePhotos.length

  return (
    <div className="space-y-6">
      <AdminPageHero
        title="Übersicht"
        description="Hier seht ihr sofort, wie eure Einladung gerade steht und welche Bereiche ihr als Nächstes sinnvoll bearbeiten könnt."
        actions={
          <>
            <ActionLink href="/admin/planung" variant="secondary">Tischplan öffnen</ActionLink>
            <ActionLink href="/admin/hilfe">Assistent öffnen</ActionLink>
          </>
        }
      />

      <RsvpStats summary={summary} />

      <div className="grid gap-4 xl:grid-cols-3">
        <article className="surface-card px-6 py-6">
          <p className="text-sm uppercase tracking-[0.18em] text-gold-700">Hochzeit</p>
          <h2 className="mt-3 font-display text-card text-charcoal-900">{config.coupleLabel}</h2>
          <div className="mt-5 flex flex-wrap gap-2">
            <Badge variant="neutral">{config.guestCode ?? 'Ohne Gästecode'}</Badge>
            <Badge variant="neutral">{config.templateId}</Badge>
            <Badge variant="neutral">{config.fontPresetId}</Badge>
          </div>
        </article>

        <article className="surface-card px-6 py-6">
          <p className="text-sm uppercase tracking-[0.18em] text-sage-700">Medien</p>
          <h2 className="mt-3 font-display text-card text-charcoal-900">{totalPhotos} Fotos</h2>
          <p className="mt-3 text-charcoal-600">
            Öffentlich: {galleryCollections.publicPhotos.length} · Privat: {galleryCollections.privatePhotos.length}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <ActionLink href="/admin/zugaenge" variant="secondary">Galerie prüfen</ActionLink>
          </div>
        </article>

        <article className="surface-card px-6 py-6">
          <p className="text-sm uppercase tracking-[0.18em] text-dusty-rose-700">Nächster sinnvoller Schritt</p>
          <h2 className="mt-3 font-display text-card text-charcoal-900">Empfohlene Reihenfolge</h2>
          <ol className="mt-4 space-y-3 text-sm text-charcoal-700">
            <li>1. Inhalte pflegen</li>
            <li>2. Zugänge und QR-Code teilen</li>
            <li>3. RSVP prüfen</li>
            <li>4. Teilnehmer in den Tischplan übernehmen</li>
          </ol>
        </article>
      </div>

      <GuestAccessCard inviteUrl={guestInviteUrl} guestCode={config.guestCode} />

      <div className="grid gap-4 lg:grid-cols-3">
        <article className="surface-card px-6 py-6">
          <h3 className="font-display text-card text-charcoal-900">Inhalte</h3>
          <p className="mt-3 text-charcoal-600">
            Texte, Bilder, Dienstleister, Dresscode und optionale Gästefunktionen bearbeiten.
          </p>
          <div className="mt-5">
            <ActionLink href="/admin/inhalte" variant="secondary">Zu den Inhalten</ActionLink>
          </div>
        </article>

        <article className="surface-card px-6 py-6">
          <h3 className="font-display text-card text-charcoal-900">Teilnehmer & Tischplan</h3>
          <p className="mt-3 text-charcoal-600">
            Interne Teilnehmerliste, Tischanzahl, Sitzplätze und visuelle Vorschau.
          </p>
          <div className="mt-5">
            <ActionLink href="/admin/planung" variant="secondary">Zur Planung</ActionLink>
          </div>
        </article>

        <article className="surface-card px-6 py-6">
          <h3 className="font-display text-card text-charcoal-900">Live-Vorschau</h3>
          <p className="mt-3 text-charcoal-600">
            Prüft die Einladung genau so, wie eure Gäste sie am Smartphone und Desktop sehen.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <ActionLink href="/admin/vorschau" variant="secondary">Zur Vorschau</ActionLink>
            {galleryHref ? (
              <ActionLink href={galleryHref} variant="ghost">Galerie</ActionLink>
            ) : null}
            {photographerHref ? (
              <ActionLink href={photographerHref} variant="ghost">Fotograf</ActionLink>
            ) : null}
          </div>
        </article>
      </div>
    </div>
  )
}
