import { NextResponse, type NextRequest } from 'next/server'

import { getAdminSessionFromCookieStore } from '@/lib/auth/admin-session'
import { resolveWeddingAccessForSession } from '@/lib/auth/admin-accounts'
import { getWeddingRetentionExpiredMessage } from '@/lib/wedding-lifecycle'
import type { ApiResponse } from '@/types/api'
import type { AdminSession } from './admin-session'
import type { WeddingConfig } from '@/types/wedding'

type RequirePaidAdminSessionResult =
  | {
      ok: true
      config: WeddingConfig
      session: AdminSession
    }
  | {
      ok: false
      response: NextResponse<ApiResponse<never>>
    }

export async function requirePaidAdminSession(
  request: NextRequest,
): Promise<RequirePaidAdminSessionResult> {
  const session = getAdminSessionFromCookieStore(request.cookies)

  if (!session) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          success: false,
          error: 'Nicht autorisiert.',
          code: 'UNAUTHORIZED',
        },
        { status: 401 },
      ),
    }
  }

  if (session.role === 'planner' && (!session.weddingSource || !session.weddingSourceId)) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          success: false,
          error: 'Bitte wähle zuerst ein Brautpaar aus.',
          code: 'WEDDING_SELECTION_REQUIRED',
        },
        { status: 409 },
      ),
    }
  }

  let billingAccess: Awaited<ReturnType<typeof resolveWeddingAccessForSession>>['billingAccess']
  let config: WeddingConfig

  try {
    const resolvedAccess = await resolveWeddingAccessForSession(session)
    billingAccess = resolvedAccess.billingAccess
    config = resolvedAccess.config
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Die ausgewählte Hochzeit konnte nicht geladen werden.'

    return {
      ok: false,
      response: NextResponse.json(
        {
          success: false,
          error: message,
          code: message === getWeddingRetentionExpiredMessage() ? 'ACCESS_EXPIRED' : 'WEDDING_NOT_AVAILABLE',
        },
        { status: message === getWeddingRetentionExpiredMessage() ? 403 : 409 },
      ),
    }
  }

  if (billingAccess.requiresPayment) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          success: false,
          error: 'Der Brautpaar-Bereich wird nach dem Kauf freigeschaltet.',
          code: 'PAYMENT_REQUIRED',
        },
        { status: 402 },
      ),
    }
  }

  return {
    ok: true,
    config,
    session,
  }
}
