import { NextResponse, type NextRequest } from 'next/server'

import { requirePaidAdminSession } from '@/lib/auth/require-paid-admin-session'
import { createPublicClient } from '@/lib/supabase/public'
import { saveWeddingEditorValues } from '@/lib/supabase/repository'
import { weddingEditorSchema } from '@/lib/validations/wedding-editor.schema'
import type { ApiResponse } from '@/types/api'
import type { WeddingConfig } from '@/types/wedding'

export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<WeddingConfig>>> {
  const access = await requirePaidAdminSession(request)

  if (!access.ok) {
    return access.response
  }

  const rawBody: unknown = await request.json().catch(() => null)
  const parseResult = weddingEditorSchema.safeParse(rawBody)

  if (!parseResult.success) {
    return NextResponse.json(
      {
        success: false,
        error: 'Bitte prüfe die eingegebenen Hochzeitsdaten.',
        code: 'VALIDATION_ERROR',
        details: parseResult.error.flatten(),
      },
      { status: 422 },
    )
  }

  const supabase = createPublicClient()

  try {
    const config = await saveWeddingEditorValues(supabase, parseResult.data)

    return NextResponse.json({
      success: true,
      data: config,
      message: 'Die Hochzeitsdaten wurden gespeichert.',
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Die Hochzeitsdaten konnten gerade nicht gespeichert werden.',
        code: 'SAVE_FAILED',
      },
      { status: 500 },
    )
  }
}
