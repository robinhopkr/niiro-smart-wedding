import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'

import { PhotographerPanel } from '@/components/photographer/PhotographerPanel'
import { PhotographerLoginForm } from '@/components/forms/PhotographerLoginForm'
import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import { Section } from '@/components/ui/Section'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { getPhotoSessionFromCookieStore } from '@/lib/auth/photo-session'
import { createClient } from '@/lib/supabase/server'
import { getGalleryCollections, getWeddingConfigByGuestCode } from '@/lib/supabase/repository'

interface PhotographerPageProps {
  params: Promise<{
    guestCode: string
  }>
}

export default async function PhotographerPage({ params }: PhotographerPageProps) {
  const resolvedParams = await params
  const supabase = await createClient()
  const config = await getWeddingConfigByGuestCode(supabase, resolvedParams.guestCode)

  if (!config?.sourceId) {
    notFound()
  }

  const cookieStore = await cookies()
  const session = getPhotoSessionFromCookieStore(cookieStore, config.sourceId)
  const galleryCollections = await getGalleryCollections(supabase, config)

  return (
    <main className="min-h-screen bg-cream-50">
      <Header
        brandHref={`/galerie/${resolvedParams.guestCode}`}
        brandLabel={`${config.coupleLabel} · Fotograf`}
        ctaHref={`/galerie/${resolvedParams.guestCode}`}
        ctaLabel="Öffentliche Galerie"
        navItems={[]}
      />

      <Section className="space-y-8">
        <div className="mx-auto max-w-3xl text-center">
          <SectionHeading as="h1">Fotografen-Bereich</SectionHeading>
          <p className="mt-4 text-charcoal-600">
            Dieser Zugang ist für den Upload und die Pflege der Hochzeitsfotos gedacht.
          </p>
        </div>

        {session ? (
          <PhotographerPanel
            coupleLabel={config.coupleLabel}
            guestCode={resolvedParams.guestCode}
            galleryCollections={galleryCollections}
            publicGalleryHref={`/galerie/${resolvedParams.guestCode}`}
            sharePrivateWithGuests={config.sharePrivateGalleryWithGuests}
          />
        ) : config.photoPassword ? (
          <PhotographerLoginForm guestCode={resolvedParams.guestCode} />
        ) : (
          <div className="surface-card mx-auto max-w-lg px-6 py-8 text-center">
            <h2 className="font-display text-card text-charcoal-900">Kein Fotografen-Zugang hinterlegt</h2>
            <p className="mt-3 text-charcoal-600">
              Für diese Hochzeit wurde noch kein separates Fotografen-Passwort eingerichtet.
            </p>
          </div>
        )}
      </Section>

      <Footer coupleLabel={config.coupleLabel} weddingDate={config.weddingDate} />
    </main>
  )
}
