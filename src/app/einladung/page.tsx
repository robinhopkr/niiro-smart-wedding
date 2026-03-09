import { WeddingInvitationPage } from '@/components/pages/WeddingInvitationPage'
import { createClient } from '@/lib/supabase/server'
import {
  getActiveWeddingConfig,
  getFaqItems,
  getProgramItems,
  listGalleryPhotos,
} from '@/lib/supabase/repository'

export default async function InvitationPage() {
  const supabase = await createClient()
  const config = await getActiveWeddingConfig(supabase)
  const [programItems, faqItems, galleryPhotos] = await Promise.all([
    getProgramItems(supabase, config),
    getFaqItems(supabase, config),
    listGalleryPhotos(supabase, config),
  ])

  return (
    <WeddingInvitationPage
      config={config}
      faqItems={faqItems}
      galleryPhotos={galleryPhotos}
      mode="live"
      programItems={programItems}
    />
  )
}
