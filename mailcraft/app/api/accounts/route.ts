import { apiError, apiSuccess, apiHandler } from '@/lib/api'
import { requireScope } from '@/lib/services/accessService'
import { prisma } from '@/lib/prisma'

// GET /api/accounts — list active accounts to share with (excludes self and own department — they already have access)
export const GET = apiHandler(async () => {
  const scope = await requireScope()
  if (!scope) return apiError('Unauthorized', 401)

  const accounts = await prisma.user.findMany({
    where: {
      isActive: true,
      id: { notIn: scope.memberIds },
    },
    select: {
      id: true,
      name: true,
      department: true,
    },
    orderBy: { name: 'asc' },
  })

  return apiSuccess(accounts)
})
