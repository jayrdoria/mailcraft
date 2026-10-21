import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import { canManageCtaPresets } from '@/lib/services/ctaPresetService'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) redirect('/login')
  const showCtaPresets = await canManageCtaPresets(session.user.id)

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        role={session.user.role}
        name={session.user.name ?? ''}
        email={session.user.email ?? ''}
        canManageCtaPresets={showCtaPresets}
      />
      <main className="flex-1 min-h-screen pt-14 md:pt-0 md:ml-56">{children}</main>
    </div>
  )
}
