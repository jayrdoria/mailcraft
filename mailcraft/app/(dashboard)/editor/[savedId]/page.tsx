interface EditorPageProps {
  params: Promise<{ savedId: string }>
}

export async function generateMetadata({ params }: EditorPageProps) {
  const { savedId } = await params
  return { title: `Edit Template — MailCraft`, description: savedId }
}

export default async function EditorPage({ params }: EditorPageProps) {
  const { savedId } = await params

  return (
    <div className="p-8">
      <h1 className="text-xl font-semibold mb-2">Edit Template</h1>
      <p className="text-sm text-muted-foreground">
        Template ID: <code className="text-xs bg-muted px-1 py-0.5 rounded">{savedId}</code>
      </p>
      <p className="text-sm text-muted-foreground mt-1">
        Editor — coming in Phase 5
      </p>
    </div>
  )
}
