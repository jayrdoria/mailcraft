import ActivityClient from '@/components/admin/ActivityClient'

export const metadata = {
  title: 'Activity — MailCraft Admin',
}

export default function ActivityPage() {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Activity</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Audit log of all user actions</p>
      </div>
      <ActivityClient />
    </div>
  )
}
