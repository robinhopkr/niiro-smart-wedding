import { redirect } from 'next/navigation'

import { getServerSession } from '@/lib/auth/get-session'

export default async function AdminIndexPage() {
  const session = await getServerSession()

  if (session?.role === 'planner') {
    redirect('/admin/hochzeiten')
  }

  redirect('/admin/uebersicht')
}
