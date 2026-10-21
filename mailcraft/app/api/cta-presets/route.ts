import { apiError, apiSuccess, apiHandler } from '@/lib/api'
import { requireScope } from '@/lib/services/accessService'
import { requireCtaPresetManager, listCtaPresets, ctaPresetSelect } from '@/lib/services/ctaPresetService'
import { ctaPresetSchema } from '@/lib/schemas'
import { rateLimit } from '@/lib/rateLimit'
import { prisma } from '@/lib/prisma'

// GET /api/cta-presets — dropdown options for the CTA Button Text field (any active account)
export const GET = apiHandler(async () => {
  const scope = await requireScope()
  if (!scope) return apiError('Unauthorized', 401)

  return apiSuccess(await listCtaPresets())
})

// POST /api/cta-presets — add a preset (admins + accounts with canManageCtaPresets), appended last
export const POST = apiHandler(async (req) => {
  const userId = await requireCtaPresetManager()
  if (!userId) return apiError('Forbidden', 403)

  if (await rateLimit(`cta-presets:${userId}`, 60, 60)) {
    return apiError('Too many requests — please wait a moment', 429)
  }

  const body = await req.json()
  const parsed = ctaPresetSchema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.errors[0].message, 400)

  const last = await prisma.ctaPreset.aggregate({ _max: { sortOrder: true } })
  const preset = await prisma.ctaPreset.create({
    data: { ...parsed.data, sortOrder: (last._max.sortOrder ?? -1) + 1 },
    select: ctaPresetSelect,
  })

  return apiSuccess(preset, 'Preset added', 201)
})
