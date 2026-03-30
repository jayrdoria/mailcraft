import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

// ─────────────────────────────────────────────
// Response helpers
// ─────────────────────────────────────────────

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json(data, { status })
}

export function apiError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

// ─────────────────────────────────────────────
// Auth guards
// Returns the session or null — caller handles the null case
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
