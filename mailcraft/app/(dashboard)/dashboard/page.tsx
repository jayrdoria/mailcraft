import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import DashboardClient from '@/components/dashboard/DashboardClient'

export const metadata = {
  title: 'Dashboard — MailCraft',
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <div>
      <div className="px-6 pt-6 pb-2">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Welcome back, {session.user.name}
        </p>
      </div>
      <DashboardClient />
    </div>
  )
}
