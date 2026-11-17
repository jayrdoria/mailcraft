import MasterLinksClient from '@/components/admin/MasterLinksClient'

export const metadata = {
  title: 'Master Links — MailCraft Admin',
}

export default async function MasterLinksPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <MasterLinksClient masterId={id} />
    </div>
  )
}
