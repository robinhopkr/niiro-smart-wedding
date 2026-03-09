import { cache } from 'react'
import { redirect } from 'next/navigation'

import { getServerSession } from '@/lib/auth/get-session'
import { getBillingAccessState } from '@/lib/billing/access'
import { ENV } from '@/lib/constants'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { getAdminWeddingConfig } from '@/lib/supabase/repository'

export const getProtectedAdminContext = cache(async () => {
  const user = await getServerSession()
  const supabase = createAdminClient() ?? (await createClient())
  const config = await getAdminWeddingConfig(supabase, undefined)
  const billingAccess = await getBillingAccessState(supabase, config)

  if (!user || billingAccess.requiresPayment) {
    redirect('/admin/login')
  }

  return {
    user,
    supabase,
    config,
    guestInviteUrl: new URL('/einladung', ENV.appUrl).toString(),
    galleryHref: config.guestCode ? `/galerie/${config.guestCode}` : null,
    photographerHref: config.guestCode ? `/fotograf/${config.guestCode}` : null,
  }
})
