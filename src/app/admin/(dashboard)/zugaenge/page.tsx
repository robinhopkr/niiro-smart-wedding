import { AdminPageHero } from '@/components/admin/AdminPageHero'
import { AdminGalleryManager } from '@/components/admin/AdminGalleryManager'
import { GuestAccessCard } from '@/components/admin/GuestAccessCard'
import { PlannerAccessCard } from '@/components/admin/PlannerAccessCard'
import { PhotographerPasswordCard } from '@/components/admin/PhotographerPasswordCard'
import { ActionLink } from '@/components/ui/ActionLink'
import { DownloadLink } from '@/components/ui/DownloadLink'
import { getProtectedAdminContext } from '@/lib/admin/dashboard'
import { formatFileSize } from '@/lib/utils/files'
import {
  getGalleryCollections,
  getGalleryStorageSummary,
  getLinkedPlannerForWedding,
} from '@/lib/supabase/repository'

export default async function AdminAccessPage() {
  const { config, galleryHref, guestInviteHref, guestInviteUrl, photographerHref, supabase, user } =
    await getProtectedAdminContext()
  const [galleryCollections, storageSummary] = await Promise.all([
    getGalleryCollections(supabase, config),
    getGalleryStorageSummary(supabase, config),
  ])
  const linkedPlanner =
    config.sourceId && config.source !== 'fallback'
      ? await getLinkedPlannerForWedding(supabase, config.source, config.sourceId)
      : null
  const totalPhotoCount =
    galleryCollections.publicPhotos.length + galleryCollections.privatePhotos.length

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
          {user.role === 'couple'
            ? 'Auf dieser Seite seht ihr den aktuellen Status der öffentlichen und privaten Galerie. Ob private Fotos zusätzlich für Gäste sichtbar werden, stellt ihr auf der Inhaltsseite ein.'
            : 'Ihr seht hier nur den öffentlichen Galeriebereich. Private Fotos bleiben ausschließlich beim Brautpaar und können nur dort freigegeben werden.'}
        </p>
        {user.role === 'couple' ? (
          <div className="mt-5">
            <ActionLink href="/admin/inhalte" variant="secondary">
              Freigabe in den Inhalten ändern
            </ActionLink>
          </div>
        ) : null}
      </div>

      <div className="surface-card px-6 py-6">
        <p className="text-eyebrow text-sage-700">Cloudflare R2</p>
        <h2 className="mt-3 font-display text-card text-charcoal-900">Galerie-Speicher im Blick behalten</h2>
        <p className="mt-3 text-body-md text-charcoal-600">
          Öffentliche und private Fotografenbilder werden jetzt über optimierte Varianten verwaltet. So
          bleibt die Galerie schneller und die Auslieferung günstiger.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[1.5rem] border border-cream-200 bg-white px-4 py-4">
            <p className="text-eyebrow text-charcoal-500">Verwalteter Speicher</p>
            <p className="mt-2 font-display text-card text-charcoal-900">
              {formatFileSize(storageSummary.totalManagedBytes)}
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-cream-200 bg-white px-4 py-4">
            <p className="text-eyebrow text-charcoal-500">Originale</p>
            <p className="mt-2 font-display text-card text-charcoal-900">
              {formatFileSize(storageSummary.originalBytes)}
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-cream-200 bg-white px-4 py-4">
            <p className="text-eyebrow text-charcoal-500">Webvarianten</p>
            <p className="mt-2 font-display text-card text-charcoal-900">
              {formatFileSize(storageSummary.derivedBytes)}
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-cream-200 bg-white px-4 py-4">
            <p className="text-eyebrow text-charcoal-500">Fotos gesamt</p>
            <p className="mt-2 font-display text-card text-charcoal-900">{storageSummary.totalPhotos}</p>
          </div>
        </div>
        <div className="mt-5 rounded-[1.5rem] bg-cream-50 px-5 py-4 text-body-md text-charcoal-700">
          <p>
            Warnung ab {formatFileSize(storageSummary.warningThresholdBytes)}, hartes Limit bei{' '}
            {formatFileSize(storageSummary.hardLimitBytes)}. Ab {storageSummary.warningPhotoCount} Fotos
            empfiehlt sich ein früher Komplettdownload oder das Ausdünnen älterer Bilder.
          </p>
          {storageSummary.warningMessages.length ? (
            <ul className="mt-3 space-y-2 text-sm text-charcoal-600">
              {storageSummary.warningMessages.map((message) => (
                <li key={message}>• {message}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-charcoal-600">
              Aktuell liegt eure Galerie innerhalb der empfohlenen Größenordnung.
            </p>
          )}
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
            {galleryCollections.publicPhotos.length ? (
              <DownloadLink href="/api/admin/gallery-download?scope=public">
                Öffentliche Galerie herunterladen
              </DownloadLink>
            ) : null}
          </div>
        </article>

        <article className="surface-card px-6 py-6">
          <p className="text-sm uppercase tracking-[0.18em] text-sage-700">
            {user.role === 'couple' ? 'Für das Brautpaar' : 'Wedding Planner'}
          </p>
          <h2 className="mt-3 font-display text-card text-charcoal-900">
            {user.role === 'couple' ? 'Eigener Zugang und Komplettdownload' : 'Eigener Zugang'}
          </h2>
          <p className="mt-3 text-charcoal-600">
            {user.role === 'couple'
              ? 'Der Paarbereich bleibt euer geschützter Bereich für Inhalte, RSVP und Planung. Zusätzlich könnt ihr hier alle öffentlichen und privaten Fotos gesammelt herunterladen.'
              : 'Ihr habt Zugriff auf die öffentliche Galerie und alle Planungsbereiche dieser Hochzeit. Private Fotos bleiben ausschließlich beim Brautpaar.'}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <ActionLink href="/admin/login" variant="secondary">Login-Seite</ActionLink>
            {user.role === 'couple' && totalPhotoCount ? (
              <DownloadLink href="/api/admin/gallery-download?scope=all">
                Komplette Galerie herunterladen
              </DownloadLink>
            ) : null}
          </div>
        </article>

        <PhotographerPasswordCard
          currentPassword={config.photoPassword ?? ''}
          photographerHref={photographerHref}
        />
      </div>

      {user.role === 'couple' ? (
        <PlannerAccessCard
          currentCustomerNumber={config.plannerCustomerNumber ?? linkedPlanner?.customerNumber ?? ''}
          linkedPlannerName={linkedPlanner?.displayName ?? null}
        />
      ) : (
        <div className="surface-card px-6 py-6">
          <p className="text-sm uppercase tracking-[0.18em] text-sage-700">Wedding Planner</p>
          <h2 className="mt-3 font-display text-card text-charcoal-900">Euer Zugriff</h2>
          <p className="mt-3 text-charcoal-600">
            Ihr habt hier Zugriff auf alle Bereiche dieser Hochzeit außer auf private Fotos. Die Verknüpfung selbst verwaltet das Brautpaar.
          </p>
        </div>
      )}

      <AdminGalleryManager
        galleryCollections={galleryCollections}
        sharePrivateWithGuests={config.sharePrivateGalleryWithGuests}
        sessionRole={user.role}
      />
    </div>
  )
}
