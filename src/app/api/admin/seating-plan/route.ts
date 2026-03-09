import { NextResponse, type NextRequest } from 'next/server'

import { requirePaidAdminSession } from '@/lib/auth/require-paid-admin-session'
import { createAdminClient } from '@/lib/supabase/admin'
import { createPublicClient } from '@/lib/supabase/public'
import {
  getAdminWeddingConfig,
  getSeatingPlanData,
  saveSeatingPlanData,
} from '@/lib/supabase/repository'
import { seatingPlanSchema } from '@/lib/validations/seating-plan.schema'
import type { ApiResponse } from '@/types/api'
import type { SeatingPlanData } from '@/types/wedding'

export async function GET(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<SeatingPlanData>>> {
  const access = await requirePaidAdminSession(request)

  if (!access.ok) {
    return access.response
  }

  const supabase = createAdminClient() ?? createPublicClient()
  const config = await getAdminWeddingConfig(supabase, undefined)
  const data = await getSeatingPlanData(supabase, config)

  return NextResponse.json(
    {
      success: true,
      data,
    },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    },
  )
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<SeatingPlanData>>> {
  const access = await requirePaidAdminSession(request)

  if (!access.ok) {
    return access.response
  }

  const rawBody: unknown = await request.json().catch(() => null)
  const parseResult = seatingPlanSchema.safeParse(rawBody)

  if (!parseResult.success) {
    return NextResponse.json(
      {
        success: false,
        error: 'Bitte prüfe Gästeliste und Sitzplan.',
        code: 'VALIDATION_ERROR',
        details: parseResult.error.flatten(),
      },
      { status: 422 },
    )
  }

  const supabase = createAdminClient() ?? createPublicClient()
  const config = await getAdminWeddingConfig(supabase, undefined)

  try {
    const data = await saveSeatingPlanData(supabase, config, parseResult.data)

    return NextResponse.json({
      success: true,
      data,
      message: 'Teilnehmerliste und Tischplan wurden gespeichert.',
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Gästeliste und Sitzplan konnten nicht gespeichert werden.',
        code: 'SAVE_FAILED',
      },
      { status: 500 },
    )
  }
}
