import { timingSafeEqual } from 'node:crypto'

import { NextResponse, type NextRequest } from 'next/server'

import {
  PHOTO_SESSION_COOKIE,
  createPhotoSessionToken,
  getPhotoSessionCookieOptions,
} from '@/lib/auth/photo-session'
import { createPublicClient } from '@/lib/supabase/public'
import { getWeddingConfigByGuestCode } from '@/lib/supabase/repository'
import { photographerLoginSchema } from '@/lib/validations/photographer.schema'
import { getWeddingGalleryExpiredMessage, isWeddingRetentionExpired } from '@/lib/wedding-lifecycle'
import type { ApiResponse } from '@/types/api'

function safeCompare(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)

  if (leftBuffer.length !== rightBuffer.length) {
    return false
  }

  return timingSafeEqual(leftBuffer, rightBuffer)
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<{ authenticated: true }>>> {
  const rawBody: unknown = await request.json().catch(() => null)
  const parseResult = photographerLoginSchema.safeParse(rawBody)

  if (!parseResult.success) {
    return NextResponse.json(
      {
        success: false,
        error: 'Ungültige Zugangsdaten.',
        code: 'VALIDATION_ERROR',
      },
      { status: 422 },
    )
  }

  const supabase = createPublicClient()
  const config = await getWeddingConfigByGuestCode(supabase, parseResult.data.guestCode)

  if (!config?.sourceId || !config.photoPassword) {
    return NextResponse.json(
      {
        success: false,
        error: 'Für diese Hochzeit ist kein Fotografen-Zugang eingerichtet.',
        code: 'NO_PHOTOGRAPHER_ACCESS',
      },
      { status: 404 },
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

  if (!safeCompare(config.photoPassword, parseResult.data.password)) {
    return NextResponse.json(
      {
        success: false,
        error: 'Das Fotografen-Passwort ist nicht korrekt.',
        code: 'INVALID_CREDENTIALS',
      },
      { status: 401 },
    )
  }

  const token = createPhotoSessionToken(config.sourceId, parseResult.data.guestCode)
  if (!token) {
    return NextResponse.json(
      {
        success: false,
        error: 'Der Fotografen-Zugang konnte nicht initialisiert werden.',
        code: 'SESSION_CREATION_FAILED',
      },
      { status: 500 },
    )
  }

  const response = NextResponse.json<ApiResponse<{ authenticated: true }>>({
    success: true,
    data: {
      authenticated: true,
    },
  })

  response.cookies.set(PHOTO_SESSION_COOKIE, token, getPhotoSessionCookieOptions())
  return response
}
