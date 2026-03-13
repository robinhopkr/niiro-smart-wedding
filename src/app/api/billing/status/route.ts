import { NextResponse, type NextRequest } from 'next/server'

import { getAdminSessionFromCookieStore } from '@/lib/auth/admin-session'
import { resolveWeddingAccessForSession } from '@/lib/auth/admin-accounts'
import { getBillingAccessState } from '@/lib/billing/access'
import { createAdminClient } from '@/lib/supabase/admin'
import { createPublicClient } from '@/lib/supabase/public'
import { getActiveWeddingConfig } from '@/lib/supabase/repository'
import type { ApiResponse } from '@/types/api'

type BillingStatusResponse = {
  access: {
    requiresPayment: boolean
    provider: 'stripe' | 'google_play' | 'legacy' | null
  }
}

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<BillingStatusResponse>>> {
  const session = getAdminSessionFromCookieStore(request.cookies)
  const supabase = createAdminClient() ?? createPublicClient()

  if (session && session.weddingSource && session.weddingSourceId) {
    try {
      const { billingAccess } = await resolveWeddingAccessForSession(session)

      return NextResponse.json(
        {
          success: true,
          data: {
            access: {
              requiresPayment: billingAccess.requiresPayment,
              provider: billingAccess.provider,
            },
          },
        },
        {
          headers: {
            'Cache-Control': 'no-store, max-age=0',
          },
        },
      )
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'Der Billing-Status konnte für diese Hochzeit nicht geladen werden.',
          code: 'WEDDING_NOT_AVAILABLE',
        },
        {
          status: 409,
          headers: {
            'Cache-Control': 'no-store, max-age=0',
          },
        },
      )
    }
  }

  const access = await getBillingAccessState(supabase, await getActiveWeddingConfig(supabase))

  return NextResponse.json(
    {
      success: true,
      data: {
        access: {
          requiresPayment: access.requiresPayment,
          provider: access.provider,
        },
      },
    },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    },
  )
}
