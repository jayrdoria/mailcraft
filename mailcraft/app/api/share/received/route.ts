import { apiError, apiSuccess, apiHandler } from '@/lib/api'
import { requireScope } from '@/lib/services/accessService'
import { prisma } from '@/lib/prisma'

// GET /api/share/received — templates shared with the current user (or any member of their department)
export const GET = apiHandler(async () => {
  const scope = await requireScope()
  if (!scope) return apiError('Unauthorized', 401)

  const shared = await prisma.sharedTemplate.findMany({
    where: { sharedWithId: { in: scope.memberIds } },
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
