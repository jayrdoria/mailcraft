import { apiError, apiSuccess, apiHandler } from '@/lib/api'
import { requireScope, ownedWhere } from '@/lib/services/accessService'
import { prisma } from '@/lib/prisma'

// GET /api/import — list saved import templates of the current user (or their department)
export const GET = apiHandler(async () => {
  const scope = await requireScope()
  if (!scope) return apiError('Unauthorized', 401)

  const imports = await prisma.savedTemplate.findMany({
    where: {
      ...ownedWhere(scope),
      masterTemplate: { isImported: true },
    },
    include: {
      masterTemplate: {
        select: { id: true, name: true, brand: true, languages: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
  })

  return apiSuccess(imports)
})
