import { NextResponse, type NextRequest } from 'next/server'

import { getPhotoSessionFromCookieStore } from '@/lib/auth/photo-session'
import {
  GALLERY_UPLOAD_ALLOWED_MIME_TYPES,
  GALLERY_UPLOAD_MAX_FILE_SIZE_BYTES,
} from '@/lib/constants'
import { createAdminClient } from '@/lib/supabase/admin'
import { createPublicClient } from '@/lib/supabase/public'
import {
  deleteGalleryPhoto,
  getWeddingConfigByGuestCode,
  uploadGalleryFiles,
} from '@/lib/supabase/repository'
import { photographerDeleteSchema } from '@/lib/validations/photographer.schema'
import { getWeddingGalleryExpiredMessage, isWeddingRetentionExpired } from '@/lib/wedding-lifecycle'
import type { ApiResponse } from '@/types/api'
import type { GalleryVisibility } from '@/types/wedding'

async function getAuthorizedConfig(request: NextRequest, guestCode: string) {
  const supabase = createAdminClient() ?? createPublicClient()
  const config = await getWeddingConfigByGuestCode(supabase, guestCode)

  if (!config?.sourceId) {
    return { supabase, config: null, authorized: false as const }
  }

  const session = getPhotoSessionFromCookieStore(request.cookies, config.sourceId)

  return {
    supabase,
    config,
    authorized: Boolean(session),
  }
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<{ uploaded: true }>>> {
  const formData = await request.formData().catch(() => null)
  const guestCode = formData?.get('guestCode')
  const visibility = formData?.get('visibility')
  const files = formData?.getAll('photos') ?? []

  if (
    typeof guestCode !== 'string' ||
    !files.length ||
    (visibility !== 'public' && visibility !== 'private')
  ) {
    return NextResponse.json(
      {
        success: false,
        error: 'Bitte wähle mindestens ein Foto und einen Zielbereich aus.',
        code: 'VALIDATION_ERROR',
      },
      { status: 422 },
    )
  }

  const { supabase, config, authorized } = await getAuthorizedConfig(request, guestCode)
  if (!config || !authorized) {
    return NextResponse.json(
      {
        success: false,
        error: 'Nicht autorisiert.',
        code: 'UNAUTHORIZED',
      },
      { status: 401 },
    )
  }

  if (isWeddingRetentionExpired(config.weddingDate)) {
    return NextResponse.json(
      {
        success: false,
        error: getWeddingGalleryExpiredMessage(),
        code: 'GALLERY_EXPIRED',
      },
      { status: 403 },
    )
  }

  const imageFiles = files.filter((file): file is File => file instanceof File)
  if (!imageFiles.length) {
    return NextResponse.json(
      {
        success: false,
        error: 'Bitte wähle gültige Bilddateien aus.',
        code: 'NO_FILES',
      },
      { status: 422 },
    )
  }

  for (const file of imageFiles) {
    if (!GALLERY_UPLOAD_ALLOWED_MIME_TYPES.includes(file.type as (typeof GALLERY_UPLOAD_ALLOWED_MIME_TYPES)[number])) {
      return NextResponse.json(
        {
          success: false,
          error: 'Erlaubt sind JPG, PNG, WebP und HEIC/HEIF.',
          code: 'INVALID_FILE_TYPE',
        },
        { status: 422 },
      )
    }

    if (file.size > GALLERY_UPLOAD_MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error: 'Ein Foto ist größer als 15 MB.',
          code: 'FILE_TOO_LARGE',
        },
        { status: 422 },
      )
    }
  }

  try {
    const uploads = await Promise.all(
      imageFiles.map(async (file) => ({
        name: file.name,
        contentType: file.type,
        body: new Uint8Array(await file.arrayBuffer()),
      })),
    )

    await uploadGalleryFiles(supabase, config, uploads, visibility as GalleryVisibility)

    return NextResponse.json({
      success: true,
      data: {
        uploaded: true,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Die Fotos konnten gerade nicht hochgeladen werden.',
        code: 'UPLOAD_FAILED',
      },
      { status: 500 },
    )
  }
}

export async function DELETE(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<{ deleted: true }>>> {
  const rawBody: unknown = await request.json().catch(() => null)
  const parseResult = photographerDeleteSchema.safeParse(rawBody)

  if (!parseResult.success) {
    return NextResponse.json(
      {
        success: false,
        error: 'Ungültige Anfrage.',
        code: 'VALIDATION_ERROR',
      },
      { status: 422 },
    )
  }

  const { supabase, config, authorized } = await getAuthorizedConfig(
    request,
    parseResult.data.guestCode,
  )
  if (!config || !authorized) {
    return NextResponse.json(
      {
        success: false,
        error: 'Nicht autorisiert.',
        code: 'UNAUTHORIZED',
      },
      { status: 401 },
    )
  }

  if (isWeddingRetentionExpired(config.weddingDate)) {
    return NextResponse.json(
      {
        success: false,
        error: getWeddingGalleryExpiredMessage(),
        code: 'GALLERY_EXPIRED',
      },
      { status: 403 },
    )
  }

  try {
    await deleteGalleryPhoto(supabase, config, parseResult.data.path)

    return NextResponse.json({
      success: true,
      data: {
        deleted: true,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Das Foto konnte gerade nicht gelöscht werden.',
        code: 'DELETE_FAILED',
      },
      { status: 500 },
    )
  }
}
