import { NextResponse, type NextRequest } from 'next/server'

import { getAdminSessionFromCookieStore } from '@/lib/auth/admin-session'
import { getBillingAccessState } from '@/lib/billing/access'
import { createAdminClient } from '@/lib/supabase/admin'
import { createPublicClient } from '@/lib/supabase/public'
import type { ApiResponse } from '@/types/api'

type RequirePaidAdminSessionResult =
  | {
      ok: true
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

  const supabase = createAdminClient() ?? createPublicClient()
  const access = await getBillingAccessState(supabase)

  if (access.requiresPayment) {
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
  }
}
