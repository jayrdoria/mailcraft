import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import UserActivityClient from '@/components/dashboard/UserActivityClient'

export const metadata = {
  title: 'My Activity — MailCraft',
}

export default async function ActivityPage() {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">My Activity</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Your personal action history
        </p>
      </div>
      <UserActivityClient />
    </div>
  )
}
