import { NextResponse, type NextRequest } from 'next/server'

import { requirePaidAdminSession } from '@/lib/auth/require-paid-admin-session'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { getAdminWeddingConfig, listRsvps } from '@/lib/supabase/repository'
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
