import { apiError, apiSuccess, apiHandler, requireAuth } from '@/lib/api'
import { prisma } from '@/lib/prisma'

// GET /api/share/received — templates shared with the current user
export const GET = apiHandler(async () => {
  const session = await requireAuth()
  if (!session) return apiError('Unauthorized', 401)

  const shared = await prisma.sharedTemplate.findMany({
    where: { sharedWithId: session.user.id },
    include: {
      savedTemplate: {
        include: {
          masterTemplate: { select: { id: true, name: true, brand: true } },
          user: { select: { id: true, name: true, department: true } },
        },
      },
      sharedBy: { select: { id: true, name: true, department: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return apiSuccess(shared)
})
