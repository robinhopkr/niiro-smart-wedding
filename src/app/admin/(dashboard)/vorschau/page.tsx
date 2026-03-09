import { Footer } from '@/components/layout/Footer'
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
import { VendorSection } from '@/components/sections/VendorSection'
import { WeddingThemeFrame } from '@/components/theme/WeddingThemeFrame'
import { AdminPageHero } from '@/components/admin/AdminPageHero'
import { getProtectedAdminContext } from '@/lib/admin/dashboard'
import {
  getFaqItems,
  getGalleryCollections,
  getMusicWishlistData,
  getProgramItems,
  getSeatingPlanData,
} from '@/lib/supabase/repository'

export default async function AdminPreviewPage() {
  const { config, supabase } = await getProtectedAdminContext()
  const [programItems, faqItems, galleryCollections, seatingPlanData, musicWishlistData] =
    await Promise.all([
      getProgramItems(supabase, config),
      getFaqItems(supabase, config),
      getGalleryCollections(supabase, config),
      getSeatingPlanData(supabase, config),
      getMusicWishlistData(supabase, config),
    ])
  const galleryPhotos = config.sharePrivateGalleryWithGuests
    ? [...galleryCollections.publicPhotos, ...galleryCollections.privatePhotos]
    : galleryCollections.publicPhotos

  return (
    <div className="space-y-6">
      <AdminPageHero
        title="Gästevorschau"
        description="Hier seht ihr die Einladung in derselben Reihenfolge und Gestaltung wie eure Gäste. So könnt ihr Inhalte, Lesbarkeit und Reihenfolge realistisch prüfen."
      />

      <WeddingThemeFrame
        className="overflow-hidden rounded-[2rem] border border-cream-200 bg-white shadow-elegant"
        templateId={config.templateId}
        fontPresetId={config.fontPresetId}
      >
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
        <VendorSection vendors={config.vendorProfiles} />
        <GallerySection
          config={config}
          photos={galleryPhotos}
          images={config.sectionImages.filter((image) => image.section === 'galerie')}
        />
        <RsvpSection
          config={config}
          images={config.sectionImages.filter((image) => image.section === 'rsvp')}
        />
        <MusicWishlistSection initialData={musicWishlistData} interactive={false} />
        <SeatingPlanSection
          guestNamesById={new Map(seatingPlanData.guests.map((guest) => [guest.id, guest.name]))}
          plan={seatingPlanData}
        />
        <FaqSection
          items={faqItems}
          images={config.sectionImages.filter((image) => image.section === 'faq')}
        />
        <Footer coupleLabel={config.coupleLabel} weddingDate={config.weddingDate} />
      </WeddingThemeFrame>
    </div>
  )
}
