import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { logoutAction } from '@/lib/actions/auth'

export const metadata = {
  title: 'Dashboard — MailCraft',
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">MailCraft</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Welcome back,{' '}
              <span className="font-medium text-foreground">{session.user.name}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Role: {session.user.role}
              {session.user.department
                ? ` · ${session.user.department.toUpperCase()}`
                : ''}
            </p>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="px-4 py-2 text-sm rounded-md border border-input
                         hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>

        <div className="rounded-xl border bg-card p-6">
          <p className="text-sm text-muted-foreground">
            ✓ Phase 1 — Auth + DB foundation working.
            <br />
            Template editor and full UI coming in Phase 2+.
          </p>
        </div>

        {session.user.role === 'ADMIN' && (
          <div className="mt-4 rounded-xl border border-dashed p-4">
            <p className="text-xs text-muted-foreground">
              Admin panel — coming in Phase 5
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
