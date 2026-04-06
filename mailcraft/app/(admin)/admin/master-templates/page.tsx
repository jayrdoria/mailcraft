import MasterTemplatesClient from '@/components/admin/MasterTemplatesClient'

export const metadata = {
  title: 'Master Templates — MailCraft Admin',
}

export default function MasterTemplatesPage() {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Master Templates</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage approved master email templates</p>
      </div>
      <MasterTemplatesClient />
    </div>
  )
}
