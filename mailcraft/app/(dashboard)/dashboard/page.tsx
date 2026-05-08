import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import DashboardClient from '@/components/dashboard/DashboardClient'

export const metadata = {
  title: 'Dashboard — MailCraft',
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect('/login')

  return <DashboardClient userName={session.user.name ?? 'there'} />
}
