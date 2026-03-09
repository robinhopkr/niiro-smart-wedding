import { createHash } from 'node:crypto'

import { NextResponse, type NextRequest } from 'next/server'

import { ENV } from '@/lib/constants'
import { createAdminClient } from '@/lib/supabase/admin'
import { createPublicClient } from '@/lib/supabase/public'
import { getActiveWeddingConfig, submitRsvp } from '@/lib/supabase/repository'
import { rsvpSchema } from '@/lib/validations/rsvp.schema'
import { normaliseDateInput } from '@/lib/utils/date'
import { checkRateLimit } from '@/lib/utils/rateLimit'
import type { ApiResponse, RsvpSubmitResponse } from '@/types/api'

function hashIp(ipAddress: string | null): string | null {
  if (!ipAddress || ipAddress === 'unknown') {
    return null
  }

  return createHash('sha256').update(ipAddress).digest('hex')
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<RsvpSubmitResponse>>> {
  try {
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    const rateLimitResult = checkRateLimit(ipAddress, ENV.rateLimitMax, ENV.rateLimitWindowMs)

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Du hast bereits geantwortet. Bitte kontaktiere uns direkt.',
          code: 'RATE_LIMITED',
        },
        { status: 429 },
      )
    }

    const rawBody: unknown = await request.json().catch(() => null)
    if (!rawBody) {
      return NextResponse.json(
        {
          success: false,
          error: 'Ungültige Anfrage.',
          code: 'INVALID_JSON',
        },
        { status: 400 },
      )
    }

    const parseResult = rsvpSchema.safeParse(rawBody)
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Ungültige Formulardaten.',
          code: 'VALIDATION_ERROR',
          details: parseResult.error.flatten(),
        },
        { status: 422 },
      )
    }

    if (parseResult.data.honeypot) {
      return NextResponse.json(
        {
          success: false,
          error: 'Ungültige Anfrage.',
          code: 'HONEYPOT_TRIGGERED',
        },
        { status: 400 },
      )
    }

    // Prefer the service role on the server so RSVP writes also work against legacy schemas with RLS.
    const supabase = createAdminClient() ?? createPublicClient()
    const config = await getActiveWeddingConfig(supabase)

    if (!config.sourceId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Es ist aktuell keine aktive Hochzeit konfiguriert.',
          code: 'NO_ACTIVE_CONFIG',
        },
        { status: 503 },
      )
    }

    const deadline = new Date(normaliseDateInput(config.rsvpDeadline) ?? config.rsvpDeadline)
    if (deadline.getTime() < Date.now()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Die Anmeldefrist ist leider abgelaufen.',
          code: 'DEADLINE_PASSED',
        },
        { status: 403 },
      )
    }

    const id = await submitRsvp(supabase, {
      values: parseResult.data,
      config,
      ipHash: hashIp(ipAddress),
      userAgent: request.headers.get('user-agent'),
    })

    return NextResponse.json({
      success: true,
      data: { id },
      message: 'Vielen Dank für deine Antwort!',
    })
  } catch (error) {
    console.error('RSVP submission failed', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Serverfehler. Bitte versuche es erneut.',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 },
    )
  }
}
