import { apiError, apiSuccess, apiHandler } from '@/lib/api'
import { requireScope, isOwnedBy } from '@/lib/services/accessService'
import { prisma } from '@/lib/prisma'

interface RouteContext {
  params: Promise<{ id: string }>
}

// DELETE /api/share/:id — remove a share (owner or admin)
export const DELETE = apiHandler(async (_req, ctx) => {
  const scope = await requireScope()
  if (!scope) return apiError('Unauthorized', 401)

  const { id } = await (ctx as RouteContext).params

  const share = await prisma.sharedTemplate.findUnique({
    where: { id },
    include: { savedTemplate: { select: { userId: true, department: true } } },
  })
  if (!share) return apiError('Share not found', 404)

  if (!scope.isAdmin && !isOwnedBy(scope, share.savedTemplate)) return apiError('Forbidden', 403)

  await prisma.sharedTemplate.delete({ where: { id } })

  return apiSuccess({ id }, 'Share removed')
})
