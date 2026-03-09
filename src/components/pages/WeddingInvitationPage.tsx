import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import { CountdownSection } from '@/components/sections/CountdownSection'
import { DresscodeSection } from '@/components/sections/DresscodeSection'
import { FaqSection } from '@/components/sections/FaqSection'
import { GallerySection } from '@/components/sections/GallerySection'
import { HeroSection } from '@/components/sections/HeroSection'
import { LocationSection } from '@/components/sections/LocationSection'
import { ProgramSection } from '@/components/sections/ProgramSection'
import { RsvpSection } from '@/components/sections/RsvpSection'
import { APP_BRAND_NAME, DEMO_NAV_ITEMS } from '@/lib/constants'
import type { FaqItem, GalleryPhoto, ProgramItem, WeddingConfig } from '@/types/wedding'

type InvitationMode = 'demo' | 'live'

interface WeddingInvitationPageProps {
  config: WeddingConfig
  faqItems: FaqItem[]
  galleryPhotos: GalleryPhoto[]
  mode?: InvitationMode
  programItems: ProgramItem[]
}

export function WeddingInvitationPage({
  config,
  faqItems,
  galleryPhotos,
  mode = 'live',
  programItems,
}: WeddingInvitationPageProps) {
  const showDemoBanner = mode === 'demo'

  return (
    <main className="min-h-screen bg-cream-50">
      <Header
        brandHref="/"
        brandLabel={APP_BRAND_NAME}
        navItems={DEMO_NAV_ITEMS}
        ctaHref="/admin/login"
        ctaLabel="Login fuer Brautpaare"
      />
      {showDemoBanner ? (
        <div className="border-b border-charcoal-900/10 bg-charcoal-900 px-6 py-3 text-sm text-cream-50 sm:px-10">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
            <p className="font-medium">
              Demohochzeit: Beispielinhalte, Beispielbilder und Demo-RSVP ohne Datenspeicherung.
            </p>
            <p className="text-cream-50/75">
              Der reale Paarbereich bleibt separat geschuetzt und kostenpflichtig.
            </p>
          </div>
        </div>
      ) : null}
      <HeroSection config={config} />
      <CountdownSection config={config} />
      <ProgramSection
        items={programItems}
        images={config.sectionImages.filter((image) => image.section === 'programm')}
      />
      <LocationSection
        config={config}
        images={config.sectionImages.filter((image) => image.section === 'anfahrt')}
      />
      <DresscodeSection
        config={config}
        images={config.sectionImages.filter((image) => image.section === 'dresscode')}
      />
      <GallerySection
        config={config}
        photos={galleryPhotos}
        images={config.sectionImages.filter((image) => image.section === 'galerie')}
      />
      <RsvpSection
        config={config}
        images={config.sectionImages.filter((image) => image.section === 'rsvp')}
        mode={mode}
      />
      <FaqSection
        items={faqItems}
        images={config.sectionImages.filter((image) => image.section === 'faq')}
      />
      <Footer coupleLabel={config.coupleLabel} />
    </main>
  )
}
