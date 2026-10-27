import { apiError, apiSuccess, apiHandler } from '@/lib/api'
import { requireCtaPresetManager } from '@/lib/services/ctaPresetService'
import { optionalTexts, thumbnailPresetSelect } from '@/lib/services/thumbnailPresetService'
import { thumbnailPresetSchema } from '@/lib/schemas'
import { rateLimit } from '@/lib/rateLimit'
import { prisma } from '@/lib/prisma'

interface RouteContext {
  params: Promise<{ id: string }>
}

// PATCH /api/thumbnail-presets/:id — edit a preset (moving brand/kind appends it last in the new group)
export const PATCH = apiHandler(async (req, ctx) => {
  const userId = await requireCtaPresetManager()
  if (!userId) return apiError('Forbidden', 403)

  if (await rateLimit(`thumbnail-presets:${userId}`, 60, 60)) {
    return apiError('Too many requests — please wait a moment', 429)
  }

  const { id } = await (ctx as RouteContext).params

  const body = await req.json()
  const parsed = thumbnailPresetSchema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.errors[0].message, 400)

  const existing = await prisma.thumbnailPreset.findUnique({ where: { id }, select: { brand: true, kind: true } })
  if (!existing) return apiError('Preset not found', 404)

  const { brand, kind, imageUrl, labels, sublabels, links } = parsed.data
  let sortOrder: number | undefined
  if (existing.brand !== brand || existing.kind !== kind) {
    const last = await prisma.thumbnailPreset.aggregate({ where: { brand, kind }, _max: { sortOrder: true } })
    sortOrder = (last._max.sortOrder ?? -1) + 1
  }

  const preset = await prisma.thumbnailPreset.update({
    where: { id },
    data: {
      brand,
      kind,
      imageUrl,
      labels,
      sublabels: optionalTexts(sublabels),
      links: optionalTexts(links),
      ...(sortOrder !== undefined ? { sortOrder } : {}),
    },
    select: thumbnailPresetSelect,
  })

  return apiSuccess(preset, 'Preset updated')
})

// DELETE /api/thumbnail-presets/:id — remove a preset (saved templates keep their values)
export const DELETE = apiHandler(async (_req, ctx) => {
  const userId = await requireCtaPresetManager()
  if (!userId) return apiError('Forbidden', 403)

  if (await rateLimit(`thumbnail-presets:${userId}`, 60, 60)) {
    return apiError('Too many requests — please wait a moment', 429)
  }

  const { id } = await (ctx as RouteContext).params

  const { count } = await prisma.thumbnailPreset.deleteMany({ where: { id } })
  if (count === 0) return apiError('Preset not found', 404)

  return apiSuccess({ id }, 'Preset deleted')
})
