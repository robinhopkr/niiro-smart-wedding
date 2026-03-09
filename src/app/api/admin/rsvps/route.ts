import { NextResponse, type NextRequest } from 'next/server'

import { requirePaidAdminSession } from '@/lib/auth/require-paid-admin-session'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { deleteRsvp, getAdminWeddingConfig, listRsvps } from '@/lib/supabase/repository'
import type { ApiResponse } from '@/types/api'
import type { RsvpRecord } from '@/types/wedding'

export async function GET(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<RsvpRecord[]>>> {
  const access = await requirePaidAdminSession(request)

  if (!access.ok) {
    return access.response
  }

  const supabase = createAdminClient() ?? (await createClient())
  const config = await getAdminWeddingConfig(supabase, undefined)
  const rsvps = await listRsvps(supabase, config)

  return NextResponse.json(
    {
      success: true,
      data: rsvps,
    },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    },
  )
}

export async function DELETE(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<{ deleted: true }>>> {
  const access = await requirePaidAdminSession(request)

  if (!access.ok) {
    return access.response
  }

  const rawBody: unknown = await request.json().catch(() => null)
  const rsvpId =
    rawBody && typeof rawBody === 'object' && 'id' in rawBody && typeof rawBody.id === 'string'
      ? rawBody.id.trim()
      : ''

  if (!rsvpId) {
    return NextResponse.json(
      {
        success: false,
        error: 'Bitte wähle eine gültige Rückmeldung aus.',
        code: 'VALIDATION_ERROR',
      },
      { status: 422 },
    )
  }

  const supabase = createAdminClient() ?? (await createClient())
  const config = await getAdminWeddingConfig(supabase, undefined)

  try {
    await deleteRsvp(supabase, config, rsvpId)

    return NextResponse.json({
      success: true,
      data: { deleted: true },
      message: 'Die Rückmeldung wurde gelöscht.',
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Die Rückmeldung konnte nicht gelöscht werden.',
        code: 'DELETE_FAILED',
      },
      { status: 500 },
    )
  }
}
