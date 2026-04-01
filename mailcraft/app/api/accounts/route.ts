import { apiError, apiSuccess, apiHandler, requireAuth } from '@/lib/api'
import { prisma } from '@/lib/prisma'

// GET /api/accounts — list all active accounts (for share modal picker)
export const GET = apiHandler(async () => {
  const session = await requireAuth()
  if (!session) return apiError('Unauthorized', 401)

  const accounts = await prisma.user.findMany({
    where: {
      isActive: true,
      id: { not: session.user.id },
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
