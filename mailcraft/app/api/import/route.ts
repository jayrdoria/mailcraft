import { apiError, apiSuccess, apiHandler, requireAuth } from '@/lib/api'
import { prisma } from '@/lib/prisma'

// GET /api/import — list current user's saved import templates
export const GET = apiHandler(async () => {
  const session = await requireAuth()
  if (!session) return apiError('Unauthorized', 401)

  const imports = await prisma.savedTemplate.findMany({
    where: {
      userId: session.user.id,
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
