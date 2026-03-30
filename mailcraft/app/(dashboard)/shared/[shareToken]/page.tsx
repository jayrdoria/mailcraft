interface SharedPageProps {
  params: Promise<{ shareToken: string }>
}

export const metadata = {
  title: 'Shared Template — MailCraft',
}

export default async function SharedTemplatePage({ params }: SharedPageProps) {
  const { shareToken } = await params

  return (
    <div className="p-8">
      <h1 className="text-xl font-semibold mb-2">Shared Template</h1>
      <p className="text-sm text-muted-foreground">
        Share token: <code className="text-xs bg-muted px-1 py-0.5 rounded">{shareToken}</code>
      </p>
      <p className="text-sm text-muted-foreground mt-1">
        View-only shared template — coming in Phase 4
      </p>
    </div>
  )
}
