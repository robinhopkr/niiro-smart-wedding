import { redirect } from 'next/navigation'
import { unstable_noStore as noStore } from 'next/cache'

import { getServerSession } from '@/lib/auth/get-session'
import { resolveWeddingAccessForSession } from '@/lib/auth/admin-accounts'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { buildInvitationPath, buildInvitationUrl } from '@/lib/urls'

export async function getProtectedAdminContext() {
  noStore()
  const user = await getServerSession()

  if (!user) {
    redirect('/admin/login')
  }

  if (user.role === 'planner' && (!user.weddingSource || !user.weddingSourceId)) {
    redirect('/admin/hochzeiten')
  }

  const supabase = createAdminClient() ?? (await createClient())
  const { billingAccess, config } = await resolveWeddingAccessForSession(user).catch(() => {
    redirect('/admin/login')
  })

  if (billingAccess.requiresPayment) {
    redirect(user.role === 'planner' ? '/admin/hochzeiten?status=zahlung-offen' : '/admin/kauf')
  }

  return {
    user,
    supabase,
    config,
    guestInviteHref: buildInvitationPath(config.guestCode),
    guestInviteUrl: buildInvitationUrl(config.guestCode),
    galleryHref: config.guestCode ? `/galerie/${config.guestCode}` : null,
    photographerHref: config.guestCode && config.photoPassword ? `/fotograf/${config.guestCode}` : null,
  }
}
