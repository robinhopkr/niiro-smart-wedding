import { NextResponse, type NextRequest } from 'next/server'

import {
  createAdminSessionToken,
  getAdminSessionCookieOptions,
  hasConfiguredAdminCredentials,
  validateAdminCredentials,
  ADMIN_SESSION_COOKIE,
} from '@/lib/auth/admin-session'
import { getBillingAccessState } from '@/lib/billing/access'
import { createAdminClient } from '@/lib/supabase/admin'
import { createPublicClient } from '@/lib/supabase/public'
import { loginSchema } from '@/lib/validations/admin.schema'
import type { ApiResponse } from '@/types/api'

type LoginResponse = {
  authenticated: true
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<LoginResponse>>> {
  const rawBody: unknown = await request.json().catch(() => null)
  const parseResult = loginSchema.safeParse(rawBody)

  if (!parseResult.success) {
    return NextResponse.json(
      {
        success: false,
        error: 'Ungültige Anmeldedaten.',
        code: 'VALIDATION_ERROR',
      },
      { status: 422 },
    )
  }

  if (!hasConfiguredAdminCredentials()) {
    return NextResponse.json(
      {
        success: false,
        error: 'Der Admin-Login ist aktuell nicht konfiguriert.',
        code: 'ADMIN_LOGIN_NOT_CONFIGURED',
      },
      { status: 503 },
    )
  }

  const supabase = createAdminClient() ?? createPublicClient()
  const billingAccess = await getBillingAccessState(supabase)

  if (billingAccess.requiresPayment) {
    return NextResponse.json(
      {
        success: false,
        error: 'Der Brautpaar-Bereich wird nach dem Kauf freigeschaltet.',
        code: 'PAYMENT_REQUIRED',
      },
      { status: 402 },
    )
  }

  if (!validateAdminCredentials(parseResult.data.email, parseResult.data.password)) {
    return NextResponse.json(
      {
        success: false,
        error: 'E-Mail oder Passwort sind nicht korrekt.',
        code: 'INVALID_CREDENTIALS',
      },
      { status: 401 },
    )
  }

  const token = createAdminSessionToken(parseResult.data.email)
  if (!token) {
    return NextResponse.json(
      {
        success: false,
        error: 'Der Admin-Login konnte nicht initialisiert werden.',
        code: 'SESSION_CREATION_FAILED',
      },
      { status: 500 },
    )
  }

  const response = NextResponse.json<ApiResponse<LoginResponse>>({
    success: true,
    data: {
      authenticated: true,
    },
  })

  response.cookies.set(ADMIN_SESSION_COOKIE, token, getAdminSessionCookieOptions())
  return response
}
