import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import DashboardClient from '@/components/dashboard/DashboardClient'

export const metadata = {
  title: 'Dashboard — MailCraft',
}

interface DashboardPageProps {
  searchParams: Promise<{ folder?: string }>
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const session = await auth()
  if (!session) redirect('/login')

  const { folder } = await searchParams

  return (
    <DashboardClient
      userName={session.user.name ?? 'there'}
      initialFolderId={folder ?? null}
    />
  )
}
