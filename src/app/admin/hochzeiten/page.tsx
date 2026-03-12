import { redirect } from 'next/navigation'

import { AdminPageHero } from '@/components/admin/AdminPageHero'
import { AdminRouteNav } from '@/components/admin/AdminRouteNav'
import { PlannerWeddingSelector } from '@/components/admin/PlannerWeddingSelector'
import { LogoutButton } from '@/components/admin/LogoutButton'
import { Section } from '@/components/ui/Section'
import { getServerSession } from '@/lib/auth/get-session'
import { listPlannerWeddingOptions } from '@/lib/auth/admin-accounts'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPlannerAccountById } from '@/lib/supabase/repository'

export default async function PlannerWeddingSelectionPage() {
  const session = await getServerSession()

  if (!session) {
    redirect('/admin/login')
  }

  if (session.role !== 'planner') {
    redirect('/admin/uebersicht')
  }

  const supabase = createAdminClient()

  if (!supabase) {
    throw new Error('Der Wedding-Planer-Bereich benötigt einen konfigurierten Service-Role-Key.')
  }

  const plannerAccount = await getPlannerAccountById(supabase, session.accountId)

  if (!plannerAccount) {
    redirect('/admin/login')
  }

  const weddings = await listPlannerWeddingOptions(session.accountId)
  const unlockedWeddings = weddings.filter((entry) => entry.billingUnlocked)
  const pendingWeddings = weddings.length - unlockedWeddings.length

  return (
    <Section className="space-y-8">
      <AdminRouteNav sessionRole="planner" />

      <AdminPageHero
        title="Wedding-Planer-Übersicht"
        description="Hier seht ihr alle Brautpaare, die euch zugeordnet wurden. Eure Registrierung ist kostenlos. Öffnen könnt ihr jeweils nur Hochzeiten, die vom Brautpaar freigegeben und bezahlt wurden. Innerhalb der Hochzeit habt ihr Zugriff auf alle Bereiche außer auf private Fotos."
        actions={
          <LogoutButton label="Logout" variant="secondary" />
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <article className="surface-card px-5 py-5">
          <p className="text-eyebrow text-charcoal-500">Zugeordnet</p>
          <p className="mt-3 font-display text-metric text-charcoal-900">{weddings.length}</p>
        </article>
        <article className="surface-card px-5 py-5">
          <p className="text-eyebrow text-charcoal-500">Freigeschaltet</p>
          <p className="mt-3 font-display text-metric text-charcoal-900">{unlockedWeddings.length}</p>
        </article>
        <article className="surface-card px-5 py-5">
          <p className="text-eyebrow text-charcoal-500">Warten auf Kauf</p>
          <p className="mt-3 font-display text-metric text-charcoal-900">{pendingWeddings}</p>
        </article>
      </div>

      <PlannerWeddingSelector customerNumber={plannerAccount.customerNumber} weddings={weddings} />
    </Section>
  )
}
