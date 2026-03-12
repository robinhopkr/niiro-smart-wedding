import { NextResponse, type NextRequest } from 'next/server'

import { createAdminClient } from '@/lib/supabase/admin'
import {
  deleteGalleryPhoto,
  getGalleryCollections,
  listAllManagedWeddingConfigs,
} from '@/lib/supabase/repository'
import { isWeddingRetentionExpired } from '@/lib/wedding-lifecycle'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function isAuthorizedCronRequest(request: NextRequest): boolean {
  const expectedSecret = process.env.CRON_SECRET?.trim()

  if (!expectedSecret) {
    return false
  }

  return request.headers.get('authorization') === `Bearer ${expectedSecret}`
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json(
      {
        success: false,
        error: 'Nicht autorisiert.',
        code: 'UNAUTHORIZED',
      },
      { status: 401 },
    )
  }

  const supabase = createAdminClient()

  if (!supabase) {
    return NextResponse.json(
      {
        success: false,
        error: 'Für den Cleanup fehlt der Supabase Service-Role-Key.',
        code: 'SERVICE_ROLE_REQUIRED',
      },
      { status: 500 },
    )
  }

  const weddings = await listAllManagedWeddingConfigs(supabase)
  let expiredWeddingCount = 0
  let deletedPhotoCount = 0
  const errors: string[] = []

  for (const config of weddings) {
    if (!config.sourceId || config.source === 'fallback' || !isWeddingRetentionExpired(config.weddingDate)) {
      continue
    }

    expiredWeddingCount += 1

    try {
      const collections = await getGalleryCollections(supabase, config)
      const photoPaths = Array.from(
        new Set(
          [...collections.publicPhotos, ...collections.privatePhotos].map((photo) => photo.originalPath ?? photo.path),
        ),
      )

      for (const path of photoPaths) {
        await deleteGalleryPhoto(supabase, config, path)
        deletedPhotoCount += 1
      }
    } catch (error) {
      errors.push(
        `${config.coupleLabel}: ${error instanceof Error ? error.message : 'Cleanup fehlgeschlagen.'}`,
      )
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      scannedWeddingCount: weddings.length,
      expiredWeddingCount,
      deletedPhotoCount,
      errors,
    },
  })
}
