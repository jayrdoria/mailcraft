import { apiError, apiSuccess, apiHandler, requireAdmin } from '@/lib/api'
import { prisma } from '@/lib/prisma'
import { getScopeForUser, ownedWhere } from '@/lib/services/accessService'

interface RouteContext {
  params: Promise<{ userId: string }>
}

// GET /api/admin/view/:userId/templates — admin view of an account's saved templates (its department's, if any)
export const GET = apiHandler(async (_req, ctx) => {
  const session = await requireAdmin()
  if (!session) return apiError('Forbidden', 403)

  const { userId } = await (ctx as RouteContext).params

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, department: true },
  })
  if (!user) return apiError('User not found', 404)

  const scope = await getScopeForUser(userId)
  if (!scope) return apiError('User not found', 404)

  const templates = await prisma.savedTemplate.findMany({
    where: ownedWhere(scope),
    include: {
      masterTemplate: { select: { id: true, name: true, brand: true, slug: true } },
      user: { select: { name: true, email: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })

  return apiSuccess({ user, templates })
})
