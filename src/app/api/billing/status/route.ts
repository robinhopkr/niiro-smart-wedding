import { NextResponse } from 'next/server'

import { getBillingAccessState } from '@/lib/billing/access'
import { createAdminClient } from '@/lib/supabase/admin'
import { createPublicClient } from '@/lib/supabase/public'
import type { ApiResponse } from '@/types/api'

type BillingStatusResponse = {
  access: Awaited<ReturnType<typeof getBillingAccessState>>
}

export async function GET(): Promise<NextResponse<ApiResponse<BillingStatusResponse>>> {
  const supabase = createAdminClient() ?? createPublicClient()
  const access = await getBillingAccessState(supabase)

  return NextResponse.json({
    success: true,
    data: {
      access,
    },
  })
}
