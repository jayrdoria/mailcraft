import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) redirect('/login')
  if (session.user.role !== 'ADMIN') redirect('/dashboard')

  return (
    <div className="min-h-screen bg-background">
      {/* Admin sidebar + header — Phase 5 */}
      <main>{children}</main>
    </div>
  )
}
