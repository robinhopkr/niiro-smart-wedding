import { NextResponse, type NextRequest } from 'next/server'

import {
  getAdminSessionCookieOptions,
  ADMIN_SESSION_COOKIE,
} from '@/lib/auth/admin-session'
import { loginAdminAccount } from '@/lib/auth/admin-accounts'
import { loginSchema } from '@/lib/validations/admin.schema'
import { getWeddingRetentionExpiredMessage } from '@/lib/wedding-lifecycle'
import type { ApiResponse } from '@/types/api'

type LoginResponse = {
  authenticated: true
  nextUrl: string
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

  try {
    const loginResult = await loginAdminAccount(parseResult.data)

    const response = NextResponse.json<ApiResponse<LoginResponse>>({
      success: true,
      data: {
        authenticated: true,
        nextUrl: loginResult.nextUrl,
      },
    })

    response.cookies.set(ADMIN_SESSION_COOKIE, loginResult.sessionToken, getAdminSessionCookieOptions())
    return response
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Der Login ist fehlgeschlagen.'
    const code =
      message === getWeddingRetentionExpiredMessage()
        ? 'ACCESS_EXPIRED'
        : message.includes('nicht korrekt')
          ? 'INVALID_CREDENTIALS'
          : 'LOGIN_FAILED'

    return NextResponse.json(
      {
        success: false,
        error: message,
        code,
      },
      { status: code === 'INVALID_CREDENTIALS' ? 401 : code === 'ACCESS_EXPIRED' ? 403 : 500 },
    )
  }
}
