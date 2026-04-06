import { apiError, apiSuccess, apiHandler, requireAdmin } from '@/lib/api'
import { getUserById } from '@/lib/services/userService'
import { prisma } from '@/lib/prisma'

interface RouteContext {
  params: Promise<{ id: string }>
}

// DELETE /api/users/:id/delete — permanently delete account (admin only)
export const DELETE = apiHandler(async (_req, ctx) => {
  const session = await requireAdmin()
  if (!session) return apiError('Forbidden', 403)

  const { id } = await (ctx as RouteContext).params

  if (id === session.user.id) return apiError('Cannot delete your own account', 400)

  const existing = await getUserById(id)
  if (!existing) return apiError('User not found', 404)

  await prisma.user.delete({ where: { id } })

  return apiSuccess({ id }, 'Account permanently deleted')
})
