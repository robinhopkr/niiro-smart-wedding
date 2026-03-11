import { AdminPageHero } from '@/components/admin/AdminPageHero'
import { AdminGalleryManager } from '@/components/admin/AdminGalleryManager'
import { GuestAccessCard } from '@/components/admin/GuestAccessCard'
import { PhotographerPasswordCard } from '@/components/admin/PhotographerPasswordCard'
import { ActionLink } from '@/components/ui/ActionLink'
import { getProtectedAdminContext } from '@/lib/admin/dashboard'
import { getGalleryCollections } from '@/lib/supabase/repository'

export default async function AdminAccessPage() {
  const { config, galleryHref, guestInviteHref, guestInviteUrl, photographerHref, supabase } =
    await getProtectedAdminContext()
  const galleryCollections = await getGalleryCollections(supabase, config)

  return (
    <div className="space-y-6">
      <AdminPageHero
        title="Zugänge und Galerie"
        description="Hier findet ihr alles, was ihr teilen oder prüfen wollt: Einladung, QR-Code, PDF-Download, Galerie und den Fotografen-Zugang."
      />

      <GuestAccessCard
        inviteHref={guestInviteHref}
        inviteUrl={guestInviteUrl}
        guestCode={config.guestCode}
      />

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
            Öffnet den Gästebereich, ladet die Einladung als PDF herunter oder springt direkt in die öffentliche Galerie.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <ActionLink href={guestInviteHref}>Einladung öffnen</ActionLink>
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

        <PhotographerPasswordCard
          currentPassword={config.photoPassword ?? ''}
          photographerHref={photographerHref}
        />
      </div>

      <AdminGalleryManager
        galleryCollections={galleryCollections}
        sharePrivateWithGuests={config.sharePrivateGalleryWithGuests}
      />
    </div>
  )
}
