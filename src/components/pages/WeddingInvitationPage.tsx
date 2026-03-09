import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import { CountdownSection } from '@/components/sections/CountdownSection'
import { DresscodeSection } from '@/components/sections/DresscodeSection'
import { FaqSection } from '@/components/sections/FaqSection'
import { GallerySection } from '@/components/sections/GallerySection'
import { HeroSection } from '@/components/sections/HeroSection'
import { LocationSection } from '@/components/sections/LocationSection'
import { MusicWishlistSection } from '@/components/sections/MusicWishlistSection'
import { ProgramSection } from '@/components/sections/ProgramSection'
import { RsvpSection } from '@/components/sections/RsvpSection'
import { SeatingPlanSection } from '@/components/sections/SeatingPlanSection'
import { WeddingThemeFrame } from '@/components/theme/WeddingThemeFrame'
import { APP_BRAND_NAME } from '@/lib/constants'
import type {
  FaqItem,
  GalleryPhoto,
  MusicWishlistData,
  ProgramItem,
  SeatingPlanData,
  WeddingConfig,
} from '@/types/wedding'

type InvitationMode = 'demo' | 'live'

interface WeddingInvitationPageProps {
  config: WeddingConfig
  faqItems: FaqItem[]
  galleryPhotos: GalleryPhoto[]
  musicWishlistData: MusicWishlistData
  mode?: InvitationMode
  programItems: ProgramItem[]
  seatingPlanData: SeatingPlanData
}

export function WeddingInvitationPage({
  config,
  faqItems,
  galleryPhotos,
  musicWishlistData,
  mode = 'live',
  programItems,
  seatingPlanData,
}: WeddingInvitationPageProps) {
  const showDemoBanner = mode === 'demo'
  const shouldShowSeatingPlan =
    seatingPlanData.isPublished &&
    seatingPlanData.tables.some(
      (table) => table.kind === 'guest' && table.seatAssignments.some((guestId) => Boolean(guestId)),
    )
  const navItems = [
    { href: '#programm', label: 'Programm' },
    { href: '#anfahrt', label: 'Anfahrt' },
    { href: '#dresscode', label: 'Dresscode' },
    { href: '#galerie', label: 'Galerie' },
    { href: '#rsvp', label: 'RSVP' },
    ...(musicWishlistData.enabled ? [{ href: '#musik', label: 'Musik' }] : []),
    ...(shouldShowSeatingPlan ? [{ href: '#sitzplan', label: 'Sitzplan' }] : []),
    { href: '#faq', label: 'FAQ' },
  ]
  const guestNamesById = new Map(seatingPlanData.guests.map((guest) => [guest.id, guest.name]))

  return (
    <WeddingThemeFrame
      as="main"
      className="min-h-screen"
      templateId={config.templateId}
      fontPresetId={config.fontPresetId}
    >
      <Header
        brandHref="/"
        brandLabel={APP_BRAND_NAME}
        navItems={navItems}
        ctaHref="/admin/login"
        ctaLabel="Login fuer Brautpaare"
        showBrandMark
      />
      {showDemoBanner ? (
        <div className="wedding-demo-banner px-6 py-3 text-sm sm:px-10">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
            <p className="font-medium">
              Demohochzeit: Beispielinhalte, Beispielbilder und Demo-RSVP ohne Datenspeicherung.
            </p>
            <p className="wedding-demo-banner-muted">
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
      <MusicWishlistSection initialData={musicWishlistData} mode={mode} />
      <SeatingPlanSection guestNamesById={guestNamesById} plan={seatingPlanData} />
      <FaqSection
        items={faqItems}
        images={config.sectionImages.filter((image) => image.section === 'faq')}
      />
      <Footer coupleLabel={config.coupleLabel} weddingDate={config.weddingDate} />
    </WeddingThemeFrame>
  )
}
