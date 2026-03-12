import { NextResponse, type NextRequest } from 'next/server'

import { requirePaidAdminSession } from '@/lib/auth/require-paid-admin-session'
import { buildGalleryArchiveResponse } from '@/lib/gallery-download'
import { createAdminClient } from '@/lib/supabase/admin'
import { createPublicClient } from '@/lib/supabase/public'
import { getGalleryCollections } from '@/lib/supabase/repository'
import type { ApiResponse } from '@/types/api'
import type { GalleryPhoto } from '@/types/wedding'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest): Promise<Response> {
  const access = await requirePaidAdminSession(request)

  if (!access.ok) {
    return access.response
  }

  const scope = request.nextUrl.searchParams.get('scope') === 'all' ? 'all' : 'public'

  if (scope === 'all' && access.session.role !== 'couple') {
    return NextResponse.json(
      {
        success: false,
        error: 'Nur das Brautpaar kann die komplette Galerie herunterladen.',
        code: 'FORBIDDEN',
      } satisfies ApiResponse<never>,
      { status: 403 },
    )
  }

  const supabase = createAdminClient() ?? createPublicClient()
  const galleryCollections = await getGalleryCollections(supabase, access.config)
  const photos: GalleryPhoto[] =
    scope === 'all'
      ? [...galleryCollections.publicPhotos, ...galleryCollections.privatePhotos]
      : galleryCollections.publicPhotos

  if (!photos.length) {
    return NextResponse.json(
      {
        success: false,
        error:
          scope === 'all'
            ? 'Es sind noch keine Fotos für den Komplettdownload vorhanden.'
            : 'Es sind noch keine öffentlichen Fotos für den Download vorhanden.',
        code: 'NO_PHOTOS',
      } satisfies ApiResponse<never>,
      { status: 409 },
    )
  }

  return buildGalleryArchiveResponse({
    supabase,
    config: access.config,
    photos,
    scope,
  })
}
