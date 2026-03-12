import { NextResponse } from 'next/server'

import { buildGalleryArchiveResponse } from '@/lib/gallery-download'
import { createPublicClient } from '@/lib/supabase/public'
import { getGalleryCollections, getWeddingConfigByGuestCode } from '@/lib/supabase/repository'
import type { ApiResponse } from '@/types/api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface GalleryDownloadRouteProps {
  params: Promise<{
    guestCode: string
  }>
}

export async function GET(
  _request: Request,
  { params }: GalleryDownloadRouteProps,
): Promise<Response> {
  const resolvedParams = await params
  const guestCode = resolvedParams.guestCode.trim().toUpperCase()
  const supabase = createPublicClient()
  const config = await getWeddingConfigByGuestCode(supabase, guestCode)

  if (!config) {
    return NextResponse.json(
      {
        success: false,
        error: 'Die Galerie wurde nicht gefunden.',
        code: 'NOT_FOUND',
      } satisfies ApiResponse<never>,
      { status: 404 },
    )
  }

  const galleryCollections = await getGalleryCollections(supabase, config)

  if (!galleryCollections.publicPhotos.length) {
    return NextResponse.json(
      {
        success: false,
        error: 'Es sind noch keine öffentlichen Fotos für den Download verfügbar.',
        code: 'NO_PUBLIC_PHOTOS',
      } satisfies ApiResponse<never>,
      { status: 409 },
    )
  }

  return buildGalleryArchiveResponse({
    supabase,
    config,
    photos: galleryCollections.publicPhotos,
    scope: 'public',
  })
}
