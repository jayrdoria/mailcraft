import { apiError, apiSuccess, apiHandler, requireAuth } from '@/lib/api'
import { prisma } from '@/lib/prisma'

interface RouteContext {
  params: Promise<{ id: string }>
}

// DELETE /api/share/:id — remove a share (owner or admin)
export const DELETE = apiHandler(async (_req, ctx) => {
  const session = await requireAuth()
  if (!session) return apiError('Unauthorized', 401)

  const { id } = await (ctx as RouteContext).params

  const share = await prisma.sharedTemplate.findUnique({
    where: { id },
    include: { savedTemplate: { select: { userId: true } } },
  })
  if (!share) return apiError('Share not found', 404)

  const isOwner = share.savedTemplate.userId === session.user.id
  const isAdmin = session.user.role === 'ADMIN'
  if (!isOwner && !isAdmin) return apiError('Forbidden', 403)

  await prisma.sharedTemplate.delete({ where: { id } })

  return apiSuccess({ id }, 'Share removed')
})
