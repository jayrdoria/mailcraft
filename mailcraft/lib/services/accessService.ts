import type { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { departmentKey } from '@/lib/department'

export { departmentKey }

// ─────────────────────────────────────────────
// Department-shared data
//
// Templates and folders created by a DEPARTMENT account belong to its department:
// every account in that department sees and edits the same rows. Admins and
// accounts without a department keep personal (per-user) data.
//
// Department and active status are read from the DB on every request (not the JWT),
// so moving or deactivating an account takes effect immediately.
// ─────────────────────────────────────────────

export interface AccessScope {
  userId: string
  name: string
  email: string
  isAdmin: boolean
  /** Department key that owns this account's data; null = personal scope */
  department: string | null
  /** Accounts whose data/shares/activity this scope covers (department members incl. self, or just self) */
  memberIds: string[]
}

type UserForScope = {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'DEPARTMENT'
  department: string | null
}

async function buildScope(user: UserForScope): Promise<AccessScope> {
  // Admins are always personal — decision: admin's own templates stay per-user
  const department = user.role === 'DEPARTMENT' ? departmentKey(user.department) : null

  let memberIds = [user.id]
  if (department) {
    // Few accounts — normalize in JS so "CRM", "crm " and "Crm" are one department
    const candidates = await prisma.user.findMany({
      where: { role: 'DEPARTMENT', department: { not: null } },
      select: { id: true, department: true },
    })
    memberIds = candidates.filter((c) => departmentKey(c.department) === department).map((c) => c.id)
    if (!memberIds.includes(user.id)) memberIds.push(user.id)
  }

  return {
    userId: user.id,
    name: user.name,
    email: user.email,
    isAdmin: user.role === 'ADMIN',
    department,
    memberIds,
  }
}

const scopeUserSelect = { id: true, name: true, email: true, role: true, department: true, isActive: true } as const

/** Scope for the signed-in account. Null when the account no longer exists or is deactivated. */
export async function getScope(userId: string): Promise<AccessScope | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: scopeUserSelect })
  if (!user || !user.isActive) return null
  return buildScope(user)
}

/** Scope of any account regardless of active status — for admin views only. */
export async function getScopeForUser(userId: string): Promise<AccessScope | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: scopeUserSelect })
  if (!user) return null
  return buildScope(user)
}

/** Auth guard for routes touching department data — replaces requireAuth() there. */
export async function requireScope(): Promise<AccessScope | null> {
  const session = await auth()
  if (!session?.user?.id) return null
  return getScope(session.user.id)
}

/** Display name for activity logs (matches the previous session-based value). */
export function scopeUserName(scope: AccessScope): string {
  return scope.name || scope.email || 'Unknown'
}

/**
 * Rows this scope owns (can list, edit, delete) — templates and folders.
 * Personal scope also requires department = null so data created while in a
 * department stays with that department after the account moves out.
 * Admins get their personal rows here; admin-wide access is handled per route.
 */
export function ownedWhere(scope: AccessScope): { department: string } | { userId: string; department: null } {
  return scope.department ? { department: scope.department } : { userId: scope.userId, department: null }
}

/** Templates this scope can open/export: owned, shared with any member, or anything for admins. */
export function readableTemplateWhere(scope: AccessScope): Prisma.SavedTemplateWhereInput {
  if (scope.isAdmin) return {}
  return {
    OR: [
      ownedWhere(scope),
      { sharedWith: { some: { sharedWithId: { in: scope.memberIds } } } },
    ],
  }
}

/** Same rule as ownedWhere, for a row already loaded. */
export function isOwnedBy(scope: AccessScope, row: { userId: string | null; department: string | null }): boolean {
  return scope.department
    ? row.department === scope.department
    : row.userId === scope.userId && row.department === null
}

/** Ownership columns for newly created templates/folders. */
export function ownershipData(scope: AccessScope): { userId: string; department: string | null } {
  return { userId: scope.userId, department: scope.department }
}
