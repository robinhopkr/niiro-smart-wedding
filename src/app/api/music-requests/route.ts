import { NextResponse, type NextRequest } from 'next/server'

import { createMusicVisitorToken, MUSIC_VOTER_COOKIE_NAME } from '@/lib/music-wishlist'
import { createAdminClient } from '@/lib/supabase/admin'
import { createPublicClient } from '@/lib/supabase/public'
import {
  addMusicRequest,
  getActiveWeddingConfig,
  getMusicWishlistData,
} from '@/lib/supabase/repository'
import { musicRequestSchema } from '@/lib/validations/music-wishlist.schema'
import { checkRateLimit } from '@/lib/utils/rateLimit'
import type { ApiResponse } from '@/types/api'
import type { MusicWishlistData } from '@/types/wedding'

const CREATE_REQUEST_LIMIT = 6
const CREATE_REQUEST_WINDOW_MS = 3_600_000

function getVisitorToken(request: NextRequest): string {
  return request.cookies.get(MUSIC_VOTER_COOKIE_NAME)?.value ?? createMusicVisitorToken()
}

function attachVisitorCookie<T>(response: NextResponse<T>, visitorToken: string): NextResponse<T> {
  response.cookies.set(MUSIC_VOTER_COOKIE_NAME, visitorToken, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })

  return response
}

export async function GET(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<MusicWishlistData>>> {
  const supabase = createAdminClient() ?? createPublicClient()
  const config = await getActiveWeddingConfig(supabase)
  const visitorToken = getVisitorToken(request)
  const data = await getMusicWishlistData(supabase, config, visitorToken)

  return attachVisitorCookie(
    NextResponse.json(
      {
        success: true,
        data,
      },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      },
    ),
    visitorToken,
  )
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<MusicWishlistData>>> {
  try {
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    const rateLimitResult = checkRateLimit(
      ipAddress,
      CREATE_REQUEST_LIMIT,
      CREATE_REQUEST_WINDOW_MS,
    )

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Bitte warte kurz, bevor du noch einen Musikwunsch einreichst.',
          code: 'RATE_LIMITED',
        },
        { status: 429 },
      )
    }

    const rawBody: unknown = await request.json().catch(() => null)
    const parseResult = musicRequestSchema.safeParse(rawBody)

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Bitte pruefe deinen Musikwunsch.',
          code: 'VALIDATION_ERROR',
          details: parseResult.error.flatten(),
        },
        { status: 422 },
      )
    }

    const supabase = createAdminClient() ?? createPublicClient()
    const config = await getActiveWeddingConfig(supabase)
    const visitorToken = getVisitorToken(request)

    const data = await addMusicRequest(
      supabase,
      config,
      {
        title: parseResult.data.title,
        artist: parseResult.data.artist || null,
        requestedBy: parseResult.data.requestedBy || null,
      },
      visitorToken,
    )

    return attachVisitorCookie(
      NextResponse.json({
        success: true,
        data,
        message: 'Musikwunsch hinzugefuegt.',
      }),
      visitorToken,
    )
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Der Musikwunsch konnte nicht gespeichert werden.',
        code: 'SAVE_FAILED',
      },
      { status: 500 },
    )
  }
}
