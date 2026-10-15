import { apiError, apiSuccess, apiHandler, requireAdmin } from '@/lib/api'
import { updateUserSchema } from '@/lib/schemas'
import {
  getUserById,
  updateUser,
  deactivateUser,
  resetUserPassword,
  canonicalDepartment,
} from '@/lib/services/userService'
import * as activityService from '@/lib/services/activityService'
import { prisma } from '@/lib/prisma'
import { accountSignInError, isPasswordLoginEnabled } from '@/lib/googleSso'

interface RouteContext {
  params: Promise<{ id: string }>
}

// GET /api/users/:id — get a user (admin only)
export const GET = apiHandler(async (_req, ctx) => {
  const session = await requireAdmin()
  if (!session) return apiError('Forbidden', 403)

  const { id } = await (ctx as RouteContext).params
  const user = await getUserById(id)
  if (!user) return apiError('User not found', 404)

  return apiSuccess(user)
})

// PATCH /api/users/:id — update user (admin only)
export const PATCH = apiHandler(async (req, ctx) => {
  const session = await requireAdmin()
  if (!session) return apiError('Forbidden', 403)

  const { id } = await (ctx as RouteContext).params

  const existing = await getUserById(id)
  if (!existing) return apiError('User not found', 404)

  const body = await req.json()
  const parsed = updateUserSchema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.errors[0].message, 400)

  const { password, ...rest } = parsed.data
  // Moving an account between departments moves the account only — data stays with the department
  if (rest.department) rest.department = await canonicalDepartment(rest.department)

  if (password && !isPasswordLoginEnabled) {
    return apiError('Password login is disabled — accounts sign in with Google', 400)
  }

  if (rest.email || password) {
    const current = await prisma.user.findUnique({ where: { id }, select: { passwordHash: true } })
    const signInError = accountSignInError(
      rest.email ?? existing.email,
      Boolean(password || current?.passwordHash)
    )
    if (signInError) return apiError(signInError, 400)
  }

  if (rest.email) {
    const taken = await prisma.user.findFirst({
      where: { email: { equals: rest.email, mode: 'insensitive' }, NOT: { id } },
      select: { id: true },
    })
    if (taken) return apiError('Email already in use', 409)
  }

  if (Object.keys(rest).length > 0) {
    await updateUser(id, rest)
  }

  if (password) {
    await resetUserPassword(id, password)
  }

  const updated = await getUserById(id)
  return apiSuccess(updated)
})

// DELETE /api/users/:id — deactivate account (admin only)
export const DELETE = apiHandler(async (_req, ctx) => {
  const session = await requireAdmin()
  if (!session) return apiError('Forbidden', 403)

  const { id } = await (ctx as RouteContext).params

  // Prevent self-deactivation
  if (id === session.user.id) return apiError('Cannot deactivate your own account', 400)

  const existing = await getUserById(id)
  if (!existing) return apiError('User not found', 404)

  await deactivateUser(id)

  await activityService.log({
    action: 'ACCOUNT_DEACTIVATED',
    userId: session.user.id,
    userName: session.user.name ?? session.user.email ?? 'Unknown',
    targetAccountName: existing.name,
  })

  return apiSuccess({ id }, 'Account deactivated')
})
