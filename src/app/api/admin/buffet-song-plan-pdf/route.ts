import { NextResponse, type NextRequest } from 'next/server'

import { requirePaidAdminSession } from '@/lib/auth/require-paid-admin-session'
import { buildBuffetSongPlanPdfFilename, createBuffetSongPlanPdf } from '@/lib/pdf/buffet-song-plan-pdf'
import { createAdminClient } from '@/lib/supabase/admin'
import { createPublicClient } from '@/lib/supabase/public'
import { getSeatingPlanData } from '@/lib/supabase/repository'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const access = await requirePaidAdminSession(request)

  if (!access.ok) {
    return access.response
  }

  try {
    const supabase = createAdminClient() ?? createPublicClient()
    const seatingPlanData = await getSeatingPlanData(supabase, access.config)
    const pdfBytes = await createBuffetSongPlanPdf(access.config, seatingPlanData)

    return new NextResponse(Uint8Array.from(pdfBytes), {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'Content-Disposition': `attachment; filename="${buildBuffetSongPlanPdfFilename(access.config)}"`,
        'Content-Type': 'application/pdf',
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Der Buffet-Songplan konnte gerade nicht als PDF erstellt werden.',
        code: 'PDF_GENERATION_FAILED',
      },
      { status: 500 },
    )
  }
}
