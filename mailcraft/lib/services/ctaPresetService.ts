import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// ─────────────────────────────────────────────
// CTA preset permissions
//
// Admins can always manage presets; other accounts need canManageCtaPresets.
// Read from the DB on every request (not the JWT), so toggling the permission
// or deactivating the account takes effect immediately.
// ─────────────────────────────────────────────

export async function canManageCtaPresets(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, isActive: true, canManageCtaPresets: true },
  })
  if (!user || !user.isActive) return false
  return user.role === 'ADMIN' || user.canManageCtaPresets
}

/** Auth guard for preset write routes. Returns the user id, or null when not allowed. */
export async function requireCtaPresetManager(): Promise<string | null> {
  const session = await auth()
  if (!session?.user?.id) return null
  return (await canManageCtaPresets(session.user.id)) ? session.user.id : null
}

export const ctaPresetSelect = {
  id: true,
  en: true,
  fr: true,
  de: true,
  it: true,
  es: true,
  sortOrder: true,
} as const

export function listCtaPresets() {
  return prisma.ctaPreset.findMany({
    select: ctaPresetSelect,
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  })
}
