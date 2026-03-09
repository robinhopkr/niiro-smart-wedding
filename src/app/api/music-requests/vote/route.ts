import { NextResponse, type NextRequest } from 'next/server'

import { createMusicVisitorToken, MUSIC_VOTER_COOKIE_NAME } from '@/lib/music-wishlist'
import { createAdminClient } from '@/lib/supabase/admin'
import { createPublicClient } from '@/lib/supabase/public'
import { getActiveWeddingConfig, voteForMusicRequest } from '@/lib/supabase/repository'
import { musicVoteSchema } from '@/lib/validations/music-wishlist.schema'
import { checkRateLimit } from '@/lib/utils/rateLimit'
import type { ApiResponse } from '@/types/api'
import type { MusicWishlistData } from '@/types/wedding'

const VOTE_LIMIT = 20
const VOTE_WINDOW_MS = 3_600_000

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

export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<MusicWishlistData>>> {
  try {
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    const rateLimitResult = checkRateLimit(ipAddress, VOTE_LIMIT, VOTE_WINDOW_MS)

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Bitte warte kurz, bevor du weitere Stimmen vergibst.',
          code: 'RATE_LIMITED',
        },
        { status: 429 },
      )
    }

    const rawBody: unknown = await request.json().catch(() => null)
    const parseResult = musicVoteSchema.safeParse(rawBody)

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Bitte waehle einen gueltigen Musikwunsch aus.',
          code: 'VALIDATION_ERROR',
          details: parseResult.error.flatten(),
        },
        { status: 422 },
      )
    }

    const supabase = createAdminClient() ?? createPublicClient()
    const config = await getActiveWeddingConfig(supabase)
    const visitorToken = getVisitorToken(request)
    const data = await voteForMusicRequest(supabase, config, {
      requestId: parseResult.data.requestId,
      visitorToken,
    })

    return attachVisitorCookie(
      NextResponse.json({
        success: true,
        data,
        message: 'Deine Stimme wurde gespeichert.',
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
            : 'Die Stimme konnte nicht gespeichert werden.',
        code: 'VOTE_FAILED',
      },
      { status: 500 },
    )
  }
}
