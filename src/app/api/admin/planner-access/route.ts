import { NextResponse, type NextRequest } from 'next/server'

import { requirePaidAdminSession } from '@/lib/auth/require-paid-admin-session'
import { createAdminClient } from '@/lib/supabase/admin'
import { createPublicClient } from '@/lib/supabase/public'
import { savePlannerCustomerNumber } from '@/lib/supabase/repository'
import { plannerCustomerNumberSchema } from '@/lib/validations/admin-registration.schema'
import type { ApiResponse } from '@/types/api'

type PlannerAccessResponse = {
  customerNumber: string | null
  linkedPlannerName: string | null
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<PlannerAccessResponse>>> {
  const access = await requirePaidAdminSession(request)

  if (!access.ok) {
    return access.response
  }

  if (access.session.role !== 'couple') {
    return NextResponse.json(
      {
        success: false,
        error: 'Nur das Brautpaar kann den Wedding Planner verknüpfen.',
        code: 'FORBIDDEN',
      },
      { status: 403 },
    )
  }

  const rawBody: unknown = await request.json().catch(() => null)
  const parseResult = plannerCustomerNumberSchema.safeParse(rawBody)

  if (!parseResult.success) {
    const flattened = parseResult.error.flatten()
    const consentError = flattened.fieldErrors.privacyConsentConfirmed?.[0]

    return NextResponse.json(
      {
        success: false,
        error:
          consentError ??
          'Bitte gib eine gültige Kundennummer ein.',
        code: 'VALIDATION_ERROR',
        details: flattened,
      },
      { status: 422 },
    )
  }

  const supabase = createAdminClient() ?? createPublicClient()

  try {
    const linkedPlanner = await savePlannerCustomerNumber(
      supabase,
      access.config,
      parseResult.data.customerNumber,
    )

    return NextResponse.json({
      success: true,
      data: {
        customerNumber: linkedPlanner?.customerNumber ?? null,
        linkedPlannerName: linkedPlanner?.displayName ?? null,
      },
      message: linkedPlanner
        ? 'Der Wedding Planner wurde mit eurer Hochzeit verknüpft.'
        : 'Die Wedding-Planer-Verknüpfung wurde entfernt.',
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Die Wedding-Planer-Verknüpfung konnte nicht gespeichert werden.',
        code: 'SAVE_FAILED',
      },
      { status: 500 },
    )
  }
}
