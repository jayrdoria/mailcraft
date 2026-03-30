export const metadata = {
  title: 'Activity — MailCraft Admin',
}

export default function ActivityPage() {
  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Activity</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Audit log of all user actions
        </p>
      </div>

      {/* Activity log — implemented in Phase 4/5 */}
      <div className="rounded-xl border border-dashed py-16 text-center">
        <p className="text-sm text-muted-foreground">
          Activity log — coming in Phase 4/5
        </p>
      </div>
    </div>
  )
}
