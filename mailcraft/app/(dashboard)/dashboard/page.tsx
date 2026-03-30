import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { FileText, Plus } from 'lucide-react'

export const metadata = {
  title: 'Dashboard — MailCraft',
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">My Templates</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Your saved email templates
        </p>
      </div>

      {/* Empty state — saved templates list implemented in Phase 4 */}
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-3">
          <FileText className="w-5 h-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium">No templates yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Browse master templates to create your first one
        </p>
        <Link
          href="/templates"
          className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
                     rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Browse Templates
        </Link>
      </div>
    </div>
  )
}
