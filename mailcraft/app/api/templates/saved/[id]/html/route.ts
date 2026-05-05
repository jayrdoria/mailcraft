import { apiError, apiHandler, requireAuth } from '@/lib/api'
import { renderTemplate, buildSectionTransformer } from '@/lib/services/renderService'
import { prisma } from '@/lib/prisma'
import * as activityService from '@/lib/services/activityService'
import type {
  Language,
  MultiLanguageFieldValues,
  SavedSectionConfig,
  LockedFieldConfig,
  TemplateFieldConfig,
} from '@/lib/types/template'

interface RouteContext {
  params: Promise<{ id: string }>
}

const VALID_LANGS: Language[] = ['en', 'fr', 'de', 'it', 'es']

// GET /api/templates/saved/:id/html?lang=en — render HTML with section markers (editor view)
export const GET = apiHandler(async (req, ctx) => {
  const session = await requireAuth()
  if (!session) return apiError('Unauthorized', 401)

  const { id } = await (ctx as RouteContext).params

  const url = new URL(req.url)
  const rawLang = url.searchParams.get('lang') ?? 'en'
  const lang = VALID_LANGS.includes(rawLang as Language) ? (rawLang as Language) : 'en'

  const isAdmin = session.user.role === 'ADMIN'

  const saved = await prisma.savedTemplate.findFirst({
    where: isAdmin
      ? { id }
      : {
          id,
          OR: [
            { userId: session.user.id },
            { sharedWith: { some: { sharedWithId: session.user.id } } },
          ],
        },
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

  await activityService.log({
    action: 'HTML_COPIED',
    userId: session.user.id,
    userName: session.user.name ?? session.user.email ?? 'Unknown',
    savedTemplateId: saved.id,
    savedTemplateName: saved.name,
    htmlType: 'full',
  })

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
})
