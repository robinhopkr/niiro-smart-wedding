import { AdminPageHero } from '@/components/admin/AdminPageHero'
import { GuestPlanningSection } from '@/components/admin/GuestPlanningSection'
import { getProtectedAdminContext } from '@/lib/admin/dashboard'
import { getSeatingPlanData, listRsvps } from '@/lib/supabase/repository'

export default async function AdminPlanningPage() {
  const { config, supabase } = await getProtectedAdminContext()
  const [rsvps, seatingPlanData] = await Promise.all([
    listRsvps(supabase, config),
    getSeatingPlanData(supabase, config),
  ])

  return (
    <div className="space-y-6">
      <AdminPageHero
        title="Teilnehmer und Tischplan"
        description="Hier arbeitet ihr intern: RSVP-Antworten lassen sich übernehmen, Teilnehmende gruppieren und anschließend manuell oder automatisch auf Tische setzen."
      />

      <div className="surface-card px-6 py-6 sm:px-8">
        <GuestPlanningSection initialData={seatingPlanData} rsvps={rsvps} />
      </div>
    </div>
  )
}
