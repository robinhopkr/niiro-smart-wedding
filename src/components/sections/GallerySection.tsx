import Link from 'next/link'

import { GalleryGrid } from '@/components/gallery/GalleryGrid'
import { DownloadLink } from '@/components/ui/DownloadLink'
import { DEMO_GUEST_CODE } from '@/lib/demo-wedding'
import { Section } from '@/components/ui/Section'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { normaliseDateInput } from '@/lib/utils/date'
import type { GalleryPhoto, SectionImage, WeddingConfig } from '@/types/wedding'

import { SectionImageGallery } from './SectionImageGallery'

interface GallerySectionProps {
  config: WeddingConfig
  photos: GalleryPhoto[]
  images?: SectionImage[]
}

function buildGalleryDescription(config: WeddingConfig, hasPhotos: boolean): string {
  if (config.galleryDescription) {
    return config.galleryDescription
  }

  const weddingDate = new Date(normaliseDateInput(config.weddingDate) ?? config.weddingDate)

  if (hasPhotos) {
    return 'Hier findet ihr die schönsten Augenblicke des Tages gesammelt an einem Ort.'
  }

  if (weddingDate.getTime() > Date.now()) {
    return 'Nach der Hochzeit veröffentlichen wir hier die schönsten Erinnerungen an unseren Tag.'
  }

  return 'Die Galerie wird gerade vorbereitet. Schaut gerne später noch einmal vorbei.'
}

export function GallerySection({ config, photos, images = [] }: GallerySectionProps) {
  const galleryHref = config.guestCode ? `/galerie/${config.guestCode}` : null
  const photographerHref =
    config.guestCode && config.photoPassword ? `/fotograf/${config.guestCode}` : null

  return (
    <Section density="compact" id="galerie" className="space-y-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <SectionHeading>{config.galleryTitle ?? 'Fotogalerie'}</SectionHeading>
          <p className="mt-4 text-charcoal-600">{buildGalleryDescription(config, photos.length > 0)}</p>
        </div>
        {galleryHref ? (
          <div className="flex flex-wrap gap-3">
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-gold-300 bg-white px-5 py-3 text-sm font-semibold text-charcoal-800 transition hover:border-gold-500 hover:text-charcoal-900"
              href={galleryHref}
            >
              Galerie öffnen
            </Link>
            {photos.length && config.guestCode !== DEMO_GUEST_CODE ? (
              <DownloadLink href={`/api/gallery-download/${config.guestCode}`}>
                Öffentliche Fotos herunterladen
              </DownloadLink>
            ) : null}
            {photographerHref ? (
              <Link
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-gold-500 px-5 py-3 text-sm font-semibold text-charcoal-900 shadow-gold transition hover:bg-gold-400"
                href={photographerHref}
              >
                Fotografen-Login
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>

      <SectionImageGallery images={images} />
      <GalleryGrid photos={photos.slice(0, 3)} />
    </Section>
  )
}
