import { apiError, apiSuccess, apiHandler, requireAuth } from '@/lib/api'
import { getMasterTemplateById } from '@/lib/services/templateService'
import { redis, CacheKeys, CacheTTL } from '@/lib/redis'
import { readTemplateHtml } from '@/lib/services/fileService'
import type { LockedFieldConfig, Language } from '@/lib/types/template'
import { LANGUAGES } from '@/lib/types/template'

interface RouteContext {
  params: Promise<{ id: string }>
}

function injectTokens(html: string, tokens: Record<string, string>): string {
  let result = html
  for (const [key, value] of Object.entries(tokens)) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    result = result.replace(new RegExp(`\\{\\{${escaped}\\}\\}`, 'g'), value)
  }
  return result
}

// GET /api/templates/master/:id/preview-html?lang=en
// Returns master HTML with locked fields pre-injected.
// Editable field {{TOKENS}} are left in place for client-side injection.
export const GET = apiHandler(async (req, ctx) => {
  const session = await requireAuth()
  if (!session) return apiError('Unauthorized', 401)

  const { id } = await (ctx as RouteContext).params
  const url = new URL(req.url)
  const lang = (url.searchParams.get('lang') ?? 'en') as Language

  if (!LANGUAGES.includes(lang)) return apiError('Invalid language', 400)

  const template = await getMasterTemplateById(id)
  if (!template || !template.isActive) return apiError('Template not found', 404)

  // Try cache
  const cacheKey = CacheKeys.masterTemplateHtml(id, lang)
  let masterHtml = await redis.get(cacheKey)

  if (!masterHtml) {
    try {
      masterHtml = await readTemplateHtml(template.baseFilePath, lang)
      await redis.set(cacheKey, masterHtml, 'EX', CacheTTL.masterTemplateHtml)
    } catch {
      return apiError('Template HTML file not found', 404)
    }
  }

  // Inject locked fields (logos, CIO tokens, footer links)
  const lockedFields = template.lockedFields as unknown as LockedFieldConfig[]
  const lockedTokens: Record<string, string> = {}
  for (const field of lockedFields) {
    lockedTokens[field.key] = field.value
  }
  const previewHtml = injectTokens(masterHtml, lockedTokens)

  return apiSuccess({ html: previewHtml })
})
