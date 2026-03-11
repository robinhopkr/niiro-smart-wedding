import { NextResponse, type NextRequest } from 'next/server'

import { requirePaidAdminSession } from '@/lib/auth/require-paid-admin-session'
import { createAdminClient } from '@/lib/supabase/admin'
import { createPublicClient } from '@/lib/supabase/public'
import { getAdminWeddingConfig } from '@/lib/supabase/repository'
import { buildInvitationUrl } from '@/lib/urls'
import { buildInvitationPdfFilename, createInvitationPdf } from '@/lib/pdf/invitation-pdf'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const access = await requirePaidAdminSession(request)

  if (!access.ok) {
    return access.response
  }

  const supabase = createAdminClient() ?? createPublicClient()
  const config = await getAdminWeddingConfig(supabase, undefined)

  if (!config.sourceId || !config.guestCode) {
    return NextResponse.json(
      {
        success: false,
        error: 'Bitte hinterlegt zuerst einen Gästecode für eure Hochzeit.',
        code: 'MISSING_GUEST_CODE',
      },
      { status: 422 },
    )
  }

  try {
    const pdfBytes = await createInvitationPdf({
      config,
      inviteUrl: buildInvitationUrl(config.guestCode),
    })
    const pdfBody = Uint8Array.from(pdfBytes)
    const pdfBlob = new Blob([pdfBody], {
      type: 'application/pdf',
    })

    return new NextResponse(pdfBlob, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'Content-Disposition': `attachment; filename="${buildInvitationPdfFilename(config)}"`,
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
            : 'Die Einladung konnte gerade nicht als PDF erstellt werden.',
        code: 'PDF_GENERATION_FAILED',
      },
      { status: 500 },
    )
  }
}
