import TemplatesClient from '@/components/templates/TemplatesClient'

export const metadata = {
  title: 'Browse Templates — MailCraft',
}

interface TemplatesPageProps {
  searchParams: Promise<{ folder?: string }>
}

export default async function TemplatesPage({ searchParams }: TemplatesPageProps) {
  const { folder } = await searchParams

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Browse Templates</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Choose a master template to start editing
        </p>
      </div>
      <TemplatesClient folderId={folder ?? null} />
    </div>
  )
}
