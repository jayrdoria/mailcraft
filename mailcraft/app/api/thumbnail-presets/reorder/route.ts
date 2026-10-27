import { apiError, apiSuccess, apiHandler } from '@/lib/api'
import { requireCtaPresetManager } from '@/lib/services/ctaPresetService'
import { listThumbnailPresets } from '@/lib/services/thumbnailPresetService'
import { reorderThumbnailPresetsSchema } from '@/lib/schemas'
import { rateLimit } from '@/lib/rateLimit'
import { prisma } from '@/lib/prisma'

// POST /api/thumbnail-presets/reorder — { brand, kind, ids } = every preset id of that group in the new order
export const POST = apiHandler(async (req) => {
  const userId = await requireCtaPresetManager()
  if (!userId) return apiError('Forbidden', 403)

  if (await rateLimit(`thumbnail-presets:${userId}`, 60, 60)) {
    return apiError('Too many requests — please wait a moment', 429)
  }

  const body = await req.json()
  const parsed = reorderThumbnailPresetsSchema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.errors[0].message, 400)

  const { brand, kind, ids } = parsed.data
  const existing = await prisma.thumbnailPreset.findMany({ where: { brand, kind }, select: { id: true } })
  const existingIds = new Set(existing.map((p) => p.id))
  // Must be exactly the group's current set — a stale list (someone added/deleted meanwhile) is refused
  if (ids.length !== existingIds.size || new Set(ids).size !== ids.length || !ids.every((id) => existingIds.has(id))) {
    return apiError('Presets changed — reload and try again', 409)
  }

  await prisma.$transaction(
    ids.map((id, index) => prisma.thumbnailPreset.update({ where: { id }, data: { sortOrder: index } }))
  )

  return apiSuccess(await listThumbnailPresets(), 'Order saved')
})
