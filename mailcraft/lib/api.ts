import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

// ─────────────────────────────────────────────
// Response helpers — envelope: { data } | { error }
// ─────────────────────────────────────────────

export function apiSuccess<T>(data: T, message?: string, status = 200) {
  return NextResponse.json(
    { data, ...(message ? { message } : {}) },
    { status }
  )
}

export function apiError(error: string, status: number) {
  return NextResponse.json({ error }, { status })
}

// ─────────────────────────────────────────────
// Auth guards
// ─────────────────────────────────────────────

export async function requireAuth() {
  const session = await auth()
  if (!session) return null
  return session
}

export async function requireAdmin() {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') return null
  return session
}

// ─────────────────────────────────────────────
// Error handler wrapper — catches unhandled throws
// ─────────────────────────────────────────────

export function apiHandler(
  handler: (req: Request, ctx: unknown) => Promise<Response>
) {
  return async (req: Request, ctx: unknown) => {
    try {
      return await handler(req, ctx)
    } catch (error) {
      console.error('[API Error]', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }
}
