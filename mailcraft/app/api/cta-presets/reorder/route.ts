import { apiError, apiSuccess, apiHandler } from '@/lib/api'
import { requireCtaPresetManager, listCtaPresets } from '@/lib/services/ctaPresetService'
import { reorderCtaPresetsSchema } from '@/lib/schemas'
import { rateLimit } from '@/lib/rateLimit'
import { prisma } from '@/lib/prisma'

// POST /api/cta-presets/reorder — { ids } = every preset id in the new dropdown order
export const POST = apiHandler(async (req) => {
  const userId = await requireCtaPresetManager()
  if (!userId) return apiError('Forbidden', 403)

  if (await rateLimit(`cta-presets:${userId}`, 60, 60)) {
    return apiError('Too many requests — please wait a moment', 429)
  }

  const body = await req.json()
  const parsed = reorderCtaPresetsSchema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.errors[0].message, 400)

  const { ids } = parsed.data
  const existing = await prisma.ctaPreset.findMany({ select: { id: true } })
  const existingIds = new Set(existing.map((p) => p.id))
  // Must be exactly the current set — a stale list (someone added/deleted meanwhile) is refused
  if (ids.length !== existingIds.size || new Set(ids).size !== ids.length || !ids.every((id) => existingIds.has(id))) {
    return apiError('Presets changed — reload and try again', 409)
  }

  await prisma.$transaction(
    ids.map((id, index) => prisma.ctaPreset.update({ where: { id }, data: { sortOrder: index } }))
  )

  return apiSuccess(await listCtaPresets(), 'Order saved')
})
