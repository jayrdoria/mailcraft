import { apiError, apiSuccess, apiHandler, requireAuth } from '@/lib/api'
import { changePasswordSchema } from '@/lib/schemas'
import { resetUserPassword } from '@/lib/services/userService'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { isPasswordLoginEnabled } from '@/lib/googleSso'

// POST /api/users/me/password — change own password (any authenticated user)
export const POST = apiHandler(async (req) => {
  const session = await requireAuth()
  if (!session) return apiError('Unauthorized', 401)

  if (!isPasswordLoginEnabled) {
    return apiError('Password login is disabled — sign in with Google', 403)
  }

  const body = await req.json()
  const parsed = changePasswordSchema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.errors[0].message, 400)

  const { currentPassword, newPassword } = parsed.data

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user) return apiError('User not found', 404)
  if (!user.passwordHash) return apiError('This account signs in with Google and has no password', 400)

  const valid = await bcrypt.compare(currentPassword, user.passwordHash)
  if (!valid) return apiError('Current password is incorrect', 400)

  await resetUserPassword(session.user.id, newPassword)

  return apiSuccess(null, 'Password changed successfully')
})
