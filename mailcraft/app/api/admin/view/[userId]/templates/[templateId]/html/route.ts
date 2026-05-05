import { apiError, apiSuccess, apiHandler, requireAdmin } from '@/lib/api'
import { renderTemplate, buildSectionTransformer } from '@/lib/services/renderService'
import { prisma } from '@/lib/prisma'
import type {
  Language,
  MultiLanguageFieldValues,
  SavedSectionConfig,
  LockedFieldConfig,
  TemplateFieldConfig,
} from '@/lib/types/template'

interface RouteContext {
  params: Promise<{ userId: string; templateId: string }>
}

const VALID_LANGS: Language[] = ['en', 'fr', 'de', 'it', 'es']

// GET /api/admin/view/:userId/templates/:templateId/html?lang=en — admin view of user's template HTML
export const GET = apiHandler(async (req, ctx) => {
  const session = await requireAdmin()
  if (!session) return apiError('Forbidden', 403)

  const { userId, templateId } = await (ctx as RouteContext).params

  const url = new URL(req.url)
  const rawLang = url.searchParams.get('lang') ?? 'en'
  const lang = VALID_LANGS.includes(rawLang as Language) ? (rawLang as Language) : 'en'

  const saved = await prisma.savedTemplate.findFirst({
    where: { id: templateId, userId },
    include: { masterTemplate: true },
  })
  if (!saved) return apiError('Template not found', 404)

  const master = saved.masterTemplate

  let html: string
  try {
    html = await renderTemplate({
      masterTemplateId: master.id,
      baseFilePath: master.baseFilePath,
      lang,
      brand: master.brand,
      lockedFields: master.lockedFields as unknown as LockedFieldConfig[],
      editableFields: master.editableFields as unknown as TemplateFieldConfig[],
      fieldValues: saved.fieldValues as unknown as MultiLanguageFieldValues,
    })
  } catch {
    return apiError(`Master HTML file not found for language "${lang}"`, 404)
  }

  const transformer = buildSectionTransformer(saved.sectionConfig as unknown as SavedSectionConfig[])
  html = transformer(html)

  return apiSuccess({ html, lang, templateName: saved.name })
})
