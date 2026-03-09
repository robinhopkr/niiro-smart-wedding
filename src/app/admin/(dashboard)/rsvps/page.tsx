import { AdminPageHero } from '@/components/admin/AdminPageHero'
import { AdminRsvpPanel } from '@/components/admin/AdminRsvpPanel'
import { ExportButton } from '@/components/admin/ExportButton'
import { getProtectedAdminContext } from '@/lib/admin/dashboard'
import { listRsvps } from '@/lib/supabase/repository'

export default async function AdminRsvpsPage() {
  const { config, supabase } = await getProtectedAdminContext()
  const rsvps = await listRsvps(supabase, config)

  return (
    <div className="space-y-6">
      <AdminPageHero
        title="RSVP-Antworten"
        description="Hier seht ihr ausschließlich die echten Antworten eurer Gäste. Einzelne Rückmeldungen könnt ihr aktualisieren, exportieren oder bei Bedarf löschen."
        actions={<ExportButton rsvps={rsvps} />}
      />

      <div className="surface-card px-6 py-6 sm:px-8">
        <AdminRsvpPanel initialRsvps={rsvps} />
      </div>
    </div>
  )
}
