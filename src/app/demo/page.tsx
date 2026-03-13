import { WeddingInvitationPage } from '@/components/pages/WeddingInvitationPage'
import {
  DEMO_FAQ_ITEMS,
  DEMO_GALLERY_PHOTOS,
  DEMO_PROGRAM_ITEMS,
  DEMO_WEDDING_CONFIG,
} from '@/lib/demo-wedding'

export default function DemoPage() {
  return (
    <WeddingInvitationPage
      config={DEMO_WEDDING_CONFIG}
      faqItems={DEMO_FAQ_ITEMS}
      galleryPhotos={DEMO_GALLERY_PHOTOS}
      musicWishlistData={{
        enabled: false,
        requests: [],
      }}
      mode="demo"
      programItems={DEMO_PROGRAM_ITEMS}
      seatingPlanData={{
        isPublished: false,
        buffetMode: {
          enabled: false,
          songs: [],
        },
        guests: [],
        tables: [],
      }}
    />
  )
}
