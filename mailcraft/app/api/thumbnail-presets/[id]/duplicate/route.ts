import { apiError, apiSuccess, apiHandler } from '@/lib/api'
import { requireCtaPresetManager } from '@/lib/services/ctaPresetService'
import { duplicateThumbnailPreset } from '@/lib/services/thumbnailPresetService'
import { rateLimit } from '@/lib/rateLimit'

interface RouteContext {
  params: Promise<{ id: string }>
}

// POST /api/thumbnail-presets/:id/duplicate — copy a preset (labels get " (Copy)"), placed right after it
export const POST = apiHandler(async (_req, ctx) => {
  const userId = await requireCtaPresetManager()
  if (!userId) return apiError('Forbidden', 403)

  if (await rateLimit(`thumbnail-presets:${userId}`, 60, 60)) {
    return apiError('Too many requests — please wait a moment', 429)
  }

  const { id } = await (ctx as RouteContext).params
  const copy = await duplicateThumbnailPreset(id)
  if (!copy) return apiError('Preset not found', 404)

  return apiSuccess(copy, 'Preset duplicated', 201)
})
