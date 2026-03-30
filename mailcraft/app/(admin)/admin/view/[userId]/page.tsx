interface ViewUserPageProps {
  params: Promise<{ userId: string }>
}

export const metadata = {
  title: 'View Department — MailCraft Admin',
}

export default async function ViewUserPage({ params }: ViewUserPageProps) {
  const { userId } = await params

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Department Templates</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Viewing saved work for user{' '}
          <code className="text-xs bg-muted px-1 py-0.5 rounded">{userId}</code>
        </p>
      </div>

      {/* Department view — implemented in Phase 4/5 */}
      <div className="rounded-xl border border-dashed py-16 text-center">
        <p className="text-sm text-muted-foreground">
          Department view — coming in Phase 4/5
        </p>
      </div>
    </div>
  )
}
