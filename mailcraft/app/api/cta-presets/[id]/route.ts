import { apiError, apiSuccess, apiHandler } from '@/lib/api'
import { requireCtaPresetManager, ctaPresetSelect } from '@/lib/services/ctaPresetService'
import { ctaPresetSchema } from '@/lib/schemas'
import { rateLimit } from '@/lib/rateLimit'
import { prisma } from '@/lib/prisma'

interface RouteContext {
  params: Promise<{ id: string }>
}

// PATCH /api/cta-presets/:id — edit a preset's texts
export const PATCH = apiHandler(async (req, ctx) => {
  const userId = await requireCtaPresetManager()
  if (!userId) return apiError('Forbidden', 403)

  if (await rateLimit(`cta-presets:${userId}`, 60, 60)) {
    return apiError('Too many requests — please wait a moment', 429)
  }

  const { id } = await (ctx as RouteContext).params

  const body = await req.json()
  const parsed = ctaPresetSchema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.errors[0].message, 400)

  const existing = await prisma.ctaPreset.findUnique({ where: { id }, select: { id: true } })
  if (!existing) return apiError('Preset not found', 404)

  const preset = await prisma.ctaPreset.update({
    where: { id },
    data: parsed.data,
    select: ctaPresetSelect,
  })

  return apiSuccess(preset, 'Preset updated')
})

// DELETE /api/cta-presets/:id — remove a preset (saved templates keep their CTA text)
export const DELETE = apiHandler(async (_req, ctx) => {
  const userId = await requireCtaPresetManager()
  if (!userId) return apiError('Forbidden', 403)

  if (await rateLimit(`cta-presets:${userId}`, 60, 60)) {
    return apiError('Too many requests — please wait a moment', 429)
  }

  const { id } = await (ctx as RouteContext).params

  const { count } = await prisma.ctaPreset.deleteMany({ where: { id } })
  if (count === 0) return apiError('Preset not found', 404)

  return apiSuccess({ id }, 'Preset deleted')
})
