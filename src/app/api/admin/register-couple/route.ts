import { NextResponse, type NextRequest } from 'next/server'

import { registerCoupleAdmin } from '@/lib/auth/admin-accounts'
import { ADMIN_SESSION_COOKIE, getAdminSessionCookieOptions } from '@/lib/auth/admin-session'
import { coupleRegistrationSchema } from '@/lib/validations/admin-registration.schema'
import type { ApiResponse } from '@/types/api'

type CoupleRegistrationResponse = {
  nextUrl: string
  registered: true
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<CoupleRegistrationResponse>>> {
  const rawBody: unknown = await request.json().catch(() => null)
  const parseResult = coupleRegistrationSchema.safeParse(rawBody)

  if (!parseResult.success) {
    return NextResponse.json(
      {
        success: false,
        error: 'Bitte prüft eure Angaben.',
        code: 'VALIDATION_ERROR',
        details: parseResult.error.flatten(),
      },
      { status: 422 },
    )
  }

  try {
    const result = await registerCoupleAdmin(parseResult.data)
    const response = NextResponse.json<ApiResponse<CoupleRegistrationResponse>>({
      success: true,
      data: {
        nextUrl: result.nextUrl,
        registered: true,
      },
      message: 'Euer Brautpaar-Konto wurde angelegt.',
    })

    response.cookies.set(ADMIN_SESSION_COOKIE, result.sessionToken, getAdminSessionCookieOptions())
    return response
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Das Brautpaar-Konto konnte nicht angelegt werden.'

    return NextResponse.json(
      {
        success: false,
        error: message,
        code: 'REGISTRATION_FAILED',
      },
      { status: message.includes('bereits') ? 409 : 500 },
    )
  }
}
