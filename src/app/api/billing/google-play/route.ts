import { NextResponse, type NextRequest } from 'next/server'

import { getAdminSessionFromCookieStore } from '@/lib/auth/admin-session'
import { resolveWeddingAccessForSession } from '@/lib/auth/admin-accounts'
import {
  isGooglePlayBillingConfigured,
  verifyGooglePlayCoupleAccessPurchase,
} from '@/lib/billing/google-play'
import { persistBillingAccessState } from '@/lib/billing/service-utils'
import type { ApiResponse } from '@/types/api'

type SyncGooglePlayBillingRequest = {
  purchaseToken?: string
}

type SyncGooglePlayBillingResponse = {
  acknowledgedAt: string | null
  provider: 'google_play'
  requiresPayment: boolean
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<SyncGooglePlayBillingResponse>>> {
  const session = getAdminSessionFromCookieStore(request.cookies)

  if (!session || session.role !== 'couple') {
    return NextResponse.json(
      {
        success: false,
        error: 'Nur das Brautpaar kann den Android-Kauf bestätigen.',
        code: 'UNAUTHORIZED',
      },
      { status: 401 },
    )
  }

  if (!isGooglePlayBillingConfigured()) {
    return NextResponse.json(
      {
        success: false,
        error: 'Google Play Billing ist noch nicht vollständig konfiguriert.',
        code: 'GOOGLE_PLAY_NOT_CONFIGURED',
      },
      { status: 503 },
    )
  }

  const body = (await request.json().catch(() => null)) as SyncGooglePlayBillingRequest | null
  const purchaseToken = body?.purchaseToken?.trim()

  if (!purchaseToken) {
    return NextResponse.json(
      {
        success: false,
        error: 'Es fehlt der Google-Play-Purchase-Token.',
        code: 'PURCHASE_TOKEN_REQUIRED',
      },
      { status: 400 },
    )
  }

  let resolvedAccess: Awaited<ReturnType<typeof resolveWeddingAccessForSession>>

  try {
    resolvedAccess = await resolveWeddingAccessForSession(session)
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Die Hochzeit für den Android-Kauf konnte nicht geladen werden.',
        code: 'WEDDING_NOT_AVAILABLE',
      },
      { status: 409 },
    )
  }

  const { billingAccess, config, coupleAccount } = resolvedAccess

  if (!billingAccess.requiresPayment) {
    return NextResponse.json({
      success: true,
      data: {
        acknowledgedAt: billingAccess.paidAt,
        provider: 'google_play',
        requiresPayment: false,
      },
    })
  }

  try {
    const purchase = await verifyGooglePlayCoupleAccessPurchase({ purchaseToken })

    const updatedAccess = await persistBillingAccessState(config, {
      status: 'paid',
      provider: 'google_play',
      email: coupleAccount?.email ?? session.email ?? null,
      paidAt: purchase.paidAt,
      stripeCheckoutSessionId: null,
      stripePaymentIntentId: null,
      googlePlayPurchaseToken: purchase.purchaseToken,
      googlePlayOrderId: purchase.orderId,
      googlePlayProductId: purchase.productId,
      googlePlayPackageName: purchase.packageName,
      googlePlayAcknowledgedAt: purchase.acknowledgedAt,
      expiresAt: null,
    })

    return NextResponse.json({
      success: true,
      data: {
        acknowledgedAt: updatedAccess.paidAt,
        provider: 'google_play',
        requiresPayment: updatedAccess.requiresPayment,
      },
    })
  } catch (error) {
    console.error('Google Play billing sync failed', error)

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Der Google-Play-Kauf konnte nicht verarbeitet werden.',
        code: 'GOOGLE_PLAY_SYNC_FAILED',
      },
      { status: 500 },
    )
  }
}
