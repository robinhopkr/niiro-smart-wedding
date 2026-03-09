import { WeddingInvitationPage } from '@/components/pages/WeddingInvitationPage'
import { createClient } from '@/lib/supabase/server'
import {
  getActiveWeddingConfig,
  getFaqItems,
  getMusicWishlistData,
  getProgramItems,
  getSeatingPlanData,
  listGalleryPhotos,
} from '@/lib/supabase/repository'

export default async function InvitationPage() {
  const supabase = await createClient()
  const config = await getActiveWeddingConfig(supabase)
  const [programItems, faqItems, galleryPhotos, seatingPlanData, musicWishlistData] = await Promise.all([
    getProgramItems(supabase, config),
    getFaqItems(supabase, config),
    listGalleryPhotos(supabase, config),
    getSeatingPlanData(supabase, config),
    getMusicWishlistData(supabase, config),
  ])

  return (
    <WeddingInvitationPage
      config={config}
      faqItems={faqItems}
      galleryPhotos={galleryPhotos}
      musicWishlistData={musicWishlistData}
      mode="live"
      programItems={programItems}
      seatingPlanData={seatingPlanData}
    />
  )
}
