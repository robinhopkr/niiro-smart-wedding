import Link from 'next/link'

import { AdminPageHero } from '@/components/admin/AdminPageHero'
import { GuestAccessCard } from '@/components/admin/GuestAccessCard'
import { GalleryGrid } from '@/components/gallery/GalleryGrid'
import { ActionLink } from '@/components/ui/ActionLink'
import { getProtectedAdminContext } from '@/lib/admin/dashboard'
import { getGalleryCollections } from '@/lib/supabase/repository'

export default async function AdminAccessPage() {
  const { config, galleryHref, guestInviteUrl, photographerHref, supabase } =
    await getProtectedAdminContext()
  const galleryCollections = await getGalleryCollections(supabase, config)

  return (
    <div className="space-y-6">
      <AdminPageHero
        title="Zugänge und Galerie"
        description="Hier findet ihr alles, was ihr teilen oder prüfen wollt: Einladung, QR-Code, Galerie und den Fotografen-Zugang."
      />

      <GuestAccessCard inviteUrl={guestInviteUrl} guestCode={config.guestCode} />

      <div className="surface-card px-6 py-6">
        <p className="text-sm uppercase tracking-[0.18em] text-charcoal-500">Wichtig zur Fotofreigabe</p>
        <h2 className="mt-3 font-display text-card text-charcoal-900">Private Fotos für Gäste freigeben</h2>
        <p className="mt-3 max-w-3xl text-charcoal-600">
          Auf dieser Seite seht ihr den aktuellen Status der öffentlichen und privaten Galerie. Ob
          private Fotos zusätzlich für Gäste sichtbar werden, stellt ihr auf der Inhaltsseite ein.
        </p>
        <div className="mt-5">
          <ActionLink href="/admin/inhalte" variant="secondary">
            Freigabe in den Inhalten ändern
          </ActionLink>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <article className="surface-card px-6 py-6">
          <p className="text-sm uppercase tracking-[0.18em] text-gold-700">Für Gäste</p>
          <h2 className="mt-3 font-display text-card text-charcoal-900">Einladung teilen</h2>
          <p className="mt-3 text-charcoal-600">
            Öffnet den Gästebereich oder springt direkt in die öffentliche Galerie.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <ActionLink href="/einladung">Einladung öffnen</ActionLink>
            {galleryHref ? (
              <ActionLink href={galleryHref} variant="secondary">Galerie-Link</ActionLink>
            ) : null}
          </div>
        </article>

        <article className="surface-card px-6 py-6">
          <p className="text-sm uppercase tracking-[0.18em] text-sage-700">Für das Brautpaar</p>
          <h2 className="mt-3 font-display text-card text-charcoal-900">Eigener Zugang</h2>
          <p className="mt-3 text-charcoal-600">
            Der Paarbereich bleibt euer geschützter Bereich für Inhalte, RSVP und Planung.
          </p>
          <div className="mt-5">
            <ActionLink href="/admin/login" variant="secondary">Login-Seite</ActionLink>
          </div>
        </article>

        <article className="surface-card px-6 py-6">
          <p className="text-sm uppercase tracking-[0.18em] text-dusty-rose-700">Für Fotograf*innen</p>
          <h2 className="mt-3 font-display text-card text-charcoal-900">Fotografen-Zugang</h2>
          <p className="mt-3 text-charcoal-600">
            Ein separater Bereich für Upload und Pflege der Fotos, getrennt vom Paarbereich.
          </p>
          <p className="mt-4 text-sm text-charcoal-500">
            Passwort: <span className="font-semibold text-charcoal-900">{config.photoPassword ? 'hinterlegt' : 'noch nicht gesetzt'}</span>
          </p>
          {photographerHref ? (
            <div className="mt-5">
              <ActionLink href={photographerHref} variant="secondary">Fotografen-Login</ActionLink>
            </div>
          ) : null}
        </article>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <article className="surface-card px-6 py-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="font-display text-card text-charcoal-900">Öffentliche Galerie</h3>
              <p className="mt-2 text-charcoal-600">Diese Bilder sehen alle Gäste.</p>
            </div>
            <span className="rounded-full bg-cream-100 px-4 py-2 text-sm font-semibold text-charcoal-800">
              {galleryCollections.publicPhotos.length} Fotos
            </span>
          </div>
          <div className="mt-5">
            <GalleryGrid
              emptyCopy="Hier erscheinen alle Bilder, die der Fotograf in den öffentlichen Bereich lädt."
              emptyTitle="Noch keine öffentlichen Fotos"
              photos={galleryCollections.publicPhotos}
            />
          </div>
        </article>

        <article className="surface-card px-6 py-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="font-display text-card text-charcoal-900">Privater Fotobereich</h3>
              <p className="mt-2 text-charcoal-600">Diese Bilder bleiben intern, bis ihr sie freigebt.</p>
              <p className="mt-2 text-sm text-charcoal-500">
                Freigabe aktuell:{' '}
                <span className="font-semibold text-charcoal-900">
                  {config.sharePrivateGalleryWithGuests ? 'aktiv' : 'deaktiviert'}
                </span>
              </p>
            </div>
            <span className="rounded-full bg-cream-100 px-4 py-2 text-sm font-semibold text-charcoal-800">
              {galleryCollections.privatePhotos.length} Fotos
            </span>
          </div>
          <div className="mt-5">
            <GalleryGrid
              emptyCopy="Hier erscheinen Bilder, die der Fotograf ausdrücklich in den privaten Bereich lädt."
              emptyTitle="Noch keine privaten Fotos"
              photos={galleryCollections.privatePhotos}
            />
          </div>
        </article>
      </div>
    </div>
  )
}
