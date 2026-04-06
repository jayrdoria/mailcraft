import { prisma } from '@/lib/prisma'
import ViewUserClient from '@/components/admin/ViewUserClient'
import AccountActivityLog from '@/components/admin/AccountActivityLog'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

interface ViewUserPageProps {
  params: Promise<{ userId: string }>
}

export const metadata = {
  title: 'View Department — MailCraft Admin',
}

export default async function ViewUserPage({ params }: ViewUserPageProps) {
  const { userId } = await params

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, department: true, email: true },
  })

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <Link
          href="/admin/accounts"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Accounts
        </Link>

        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-semibold">
              {user?.name ?? 'Department'}&apos;s Templates
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {user?.department && `${user.department} — `}{user?.email}
            </p>
          </div>
          <div className="ml-2 px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-500 text-xs font-medium">
            Viewing as Admin
          </div>
        </div>
      </div>

      <ViewUserClient userId={userId} />

      <div className="mt-8">
        <AccountActivityLog userId={userId} />
      </div>
    </div>
  )
}
