import { apiError, apiSuccess, apiHandler, requireAdmin } from '@/lib/api'
import { createUserSchema } from '@/lib/schemas'
import { getAllUsers, createUser } from '@/lib/services/userService'
import { prisma } from '@/lib/prisma'
import * as activityService from '@/lib/services/activityService'

// GET /api/users — list all accounts (admin only)
export const GET = apiHandler(async () => {
  const session = await requireAdmin()
  if (!session) return apiError('Forbidden', 403)

  const users = await getAllUsers()
  return apiSuccess(users)
})

// POST /api/users — create a new department account (admin only)
export const POST = apiHandler(async (req) => {
  const session = await requireAdmin()
  if (!session) return apiError('Forbidden', 403)

  const body = await req.json()
  const parsed = createUserSchema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.errors[0].message, 400)

  const { email, name, password, department, canAccessEmails } = parsed.data

  let user
  try {
    user = await createUser({ email, name, password, department })
  } catch (err) {
    if (err instanceof Error && err.message === 'Email already in use') {
      return apiError('Email already in use', 409)
    }
    throw err
  }

  // Update canAccessEmails if different from default
  if (!canAccessEmails) {
    await prisma.user.update({ where: { id: user.id }, data: { canAccessEmails } })
  }

  await activityService.log({
    action: 'ACCOUNT_CREATED',
    userId: session.user.id,
    userName: session.user.name ?? session.user.email ?? 'Unknown',
    targetAccountName: name,
  })

  return apiSuccess({ id: user.id, email: user.email, name: user.name }, 'Account created', 201)
})
