import { apiError, apiSuccess, apiHandler } from '@/lib/api'
import { requireScope, ownedWhere } from '@/lib/services/accessService'
import { createShareSchema } from '@/lib/schemas'
import { prisma } from '@/lib/prisma'

// POST /api/share — share a saved template with one or more accounts
export const POST = apiHandler(async (req) => {
  const scope = await requireScope()
  if (!scope) return apiError('Unauthorized', 401)

  const body = await req.json()
  const parsed = createShareSchema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.errors[0].message, 400)

  const { savedTemplateId, sharedWithIds } = parsed.data

  // Verify ownership (department or personal)
  const saved = await prisma.savedTemplate.findFirst({
    where: { id: savedTemplateId, ...ownedWhere(scope) },
  })
  if (!saved) return apiError('Template not found', 404)

  // Verify all target users exist and are active
  const targets = await prisma.user.findMany({
    where: { id: { in: sharedWithIds }, isActive: true },
    select: { id: true },
  })
  if (targets.length !== sharedWithIds.length) {
    return apiError('One or more target accounts not found', 404)
  }

  // Upsert shares (skip duplicates)
  await prisma.sharedTemplate.createMany({
    data: sharedWithIds.map((sharedWithId) => ({
      savedTemplateId,
      sharedById: scope.userId,
      sharedWithId,
    })),
    skipDuplicates: true,
  })

  return apiSuccess(
    { shared: sharedWithIds.length },
    `Template shared with ${sharedWithIds.length} account${sharedWithIds.length === 1 ? '' : 's'}`
  )
})
