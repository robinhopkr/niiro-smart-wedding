import Link from 'next/link'
import { notFound } from 'next/navigation'

import { GalleryGrid } from '@/components/gallery/GalleryGrid'
import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import { Section } from '@/components/ui/Section'
import { SectionHeading } from '@/components/ui/SectionHeading'
import {
  DEMO_GALLERY_PHOTOS,
  DEMO_GUEST_CODE,
  DEMO_WEDDING_CONFIG,
} from '@/lib/demo-wedding'
import { createClient } from '@/lib/supabase/server'
import { getGalleryCollections, getWeddingConfigByGuestCode } from '@/lib/supabase/repository'

interface GalleryPageProps {
  params: Promise<{
    guestCode: string
  }>
}

export default async function GalleryPage({ params }: GalleryPageProps) {
  const resolvedParams = await params
  const normalizedGuestCode = resolvedParams.guestCode.trim().toUpperCase()

  if (normalizedGuestCode === DEMO_GUEST_CODE) {
    return (
      <main className="min-h-screen bg-cream-50">
        <Header
          brandHref="/demo"
          brandLabel={DEMO_WEDDING_CONFIG.coupleLabel}
          ctaHref="/admin/login"
          ctaLabel="Login fuer Brautpaare"
          navItems={[]}
        />

        <Section className="space-y-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <SectionHeading>
                {DEMO_WEDDING_CONFIG.galleryTitle ?? `Fotogalerie von ${DEMO_WEDDING_CONFIG.coupleLabel}`}
              </SectionHeading>
              <p className="mt-4 text-charcoal-600">
                {DEMO_WEDDING_CONFIG.galleryDescription ??
                  'Hier sammeln wir nach und nach die schoensten Erinnerungen an unseren gemeinsamen Tag.'}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-gold-300 bg-white px-5 py-3 text-sm font-semibold text-charcoal-800 transition hover:border-gold-500 hover:text-charcoal-900"
                href="/demo"
              >
                Zur Demo-Einladung
              </Link>
            </div>
          </div>

          <GalleryGrid
            emptyCopy="Die ersten Fotos werden gerade vorbereitet. Sobald Bilder veroeffentlicht sind, erscheinen sie hier."
            emptyTitle="Noch sind keine Fotos online."
            photos={DEMO_GALLERY_PHOTOS}
          />
        </Section>

        <Footer coupleLabel={DEMO_WEDDING_CONFIG.coupleLabel} weddingDate={DEMO_WEDDING_CONFIG.weddingDate} />
      </main>
    )
  }

  const supabase = await createClient()
  const config = await getWeddingConfigByGuestCode(supabase, resolvedParams.guestCode)

  if (!config) {
    notFound()
  }

  const galleryCollections = await getGalleryCollections(supabase, config)
  const photos = galleryCollections.publicPhotos
  const sharedPrivatePhotos = config.sharePrivateGalleryWithGuests ? galleryCollections.privatePhotos : []

  return (
    <main className="min-h-screen bg-cream-50">
      <Header
        brandHref="/einladung"
        brandLabel={config.coupleLabel}
        ctaHref="/admin/login"
        ctaLabel="Login für Brautpaare"
        navItems={[]}
      />

      <Section className="space-y-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <SectionHeading>{config.galleryTitle ?? `Fotogalerie von ${config.coupleLabel}`}</SectionHeading>
            <p className="mt-4 text-charcoal-600">
              {config.galleryDescription ??
                'Hier sammeln wir nach und nach die schönsten Erinnerungen an unseren gemeinsamen Tag.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-gold-300 bg-white px-5 py-3 text-sm font-semibold text-charcoal-800 transition hover:border-gold-500 hover:text-charcoal-900"
              href="/einladung"
            >
              Zur Einladung
            </Link>
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-gold-500 px-5 py-3 text-sm font-semibold text-charcoal-900 shadow-gold transition hover:bg-gold-400"
              href={`/fotograf/${resolvedParams.guestCode}`}
            >
              Fotografen-Login
            </Link>
          </div>
        </div>

        <GalleryGrid
          emptyCopy="Die ersten Fotos werden gerade vorbereitet. Sobald Bilder veröffentlicht sind, erscheinen sie hier."
          emptyTitle="Noch sind keine Fotos online."
          photos={photos}
        />
        {sharedPrivatePhotos.length ? (
          <div className="space-y-5">
            <div className="max-w-3xl">
              <SectionHeading>Zusätzliche Freigabe des Brautpaares</SectionHeading>
              <p className="mt-4 text-charcoal-600">
                Diese Auswahl wurde vom Brautpaar zusätzlich aus dem privaten Bereich für alle Gäste freigegeben.
              </p>
            </div>
            <GalleryGrid photos={sharedPrivatePhotos} />
          </div>
        ) : null}
      </Section>

      <Footer coupleLabel={config.coupleLabel} weddingDate={config.weddingDate} />
    </main>
  )
}
