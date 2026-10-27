import { apiError, apiSuccess, apiHandler } from '@/lib/api'
import { requireScope } from '@/lib/services/accessService'
import { requireCtaPresetManager } from '@/lib/services/ctaPresetService'
import { listThumbnailPresets, optionalTexts, thumbnailPresetSelect } from '@/lib/services/thumbnailPresetService'
import { thumbnailPresetSchema } from '@/lib/schemas'
import { rateLimit } from '@/lib/rateLimit'
import { prisma } from '@/lib/prisma'
import { PRESET_BRANDS, type PresetBrand } from '@/lib/types/thumbnailPreset'

// GET /api/thumbnail-presets[?brand=X7_V2] — quick picks for thumbnail slots (any active account)
export const GET = apiHandler(async (req) => {
  const scope = await requireScope()
  if (!scope) return apiError('Unauthorized', 401)

  const brandParam = new URL(req.url).searchParams.get('brand')
  if (brandParam !== null && !PRESET_BRANDS.includes(brandParam as PresetBrand)) {
    return apiError('Unknown brand', 400)
  }

  return apiSuccess(await listThumbnailPresets((brandParam as PresetBrand | null) ?? undefined))
})

// POST /api/thumbnail-presets — add a preset (admins + accounts with canManageCtaPresets), appended last in its group
export const POST = apiHandler(async (req) => {
  const userId = await requireCtaPresetManager()
  if (!userId) return apiError('Forbidden', 403)

  if (await rateLimit(`thumbnail-presets:${userId}`, 60, 60)) {
    return apiError('Too many requests — please wait a moment', 429)
  }

  const body = await req.json()
  const parsed = thumbnailPresetSchema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.errors[0].message, 400)

  const { brand, kind, imageUrl, labels, sublabels, links } = parsed.data
  const last = await prisma.thumbnailPreset.aggregate({ where: { brand, kind }, _max: { sortOrder: true } })
  const preset = await prisma.thumbnailPreset.create({
    data: {
      brand,
      kind,
      imageUrl,
      labels,
      sublabels: optionalTexts(sublabels),
      links: optionalTexts(links),
      sortOrder: (last._max.sortOrder ?? -1) + 1,
    },
    select: thumbnailPresetSelect,
  })

  return apiSuccess(preset, 'Preset added', 201)
})
