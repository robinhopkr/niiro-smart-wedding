import { AdminDashboardShell } from '@/components/admin/AdminDashboardShell'
import { getProtectedAdminContext } from '@/lib/admin/dashboard'

interface AdminDashboardLayoutProps {
  children: React.ReactNode
}

export default async function AdminDashboardLayout({ children }: AdminDashboardLayoutProps) {
  const { config, galleryHref, guestInviteUrl, photographerHref } = await getProtectedAdminContext()

  return (
    <AdminDashboardShell
      config={config}
      galleryHref={galleryHref}
      guestInviteUrl={guestInviteUrl}
      photographerHref={photographerHref}
    >
      {children}
    </AdminDashboardShell>
  )
}
