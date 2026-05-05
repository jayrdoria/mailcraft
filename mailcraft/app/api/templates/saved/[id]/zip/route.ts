import { apiError, apiHandler, requireAuth } from '@/lib/api'
import { renderTemplate, buildSectionTransformer } from '@/lib/services/renderService'
import { cleanHtml } from '@/lib/services/sectionService'
import { prisma } from '@/lib/prisma'
import * as activityService from '@/lib/services/activityService'
import { LANGUAGES } from '@/lib/types/template'
import type {
  MultiLanguageFieldValues,
  SavedSectionConfig,
  LockedFieldConfig,
  TemplateFieldConfig,
  Language,
} from '@/lib/types/template'
import JSZip from 'jszip'

interface RouteContext {
  params: Promise<{ id: string }>
}

// GET /api/templates/saved/:id/zip — download all language clean HTML files as ZIP
export const GET = apiHandler(async (_req, ctx) => {
  const session = await requireAuth()
  if (!session) return apiError('Unauthorized', 401)

  const { id } = await (ctx as RouteContext).params
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
  const masterRaw = master as unknown as { languages?: unknown }
  const masterLanguages = (masterRaw.languages as Language[]) ?? []
  const activeLangs: Language[] = masterLanguages.length > 0 ? masterLanguages : LANGUAGES
  const transformer = buildSectionTransformer(saved.sectionConfig as unknown as SavedSectionConfig[])
  const zip = new JSZip()

  // Slug for the folder name inside zip
  const folderName = saved.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

  const folder = zip.folder(folderName)!

  const results = await Promise.allSettled(
    activeLangs.map(async (lang) => {
      const html = await renderTemplate({
        masterTemplateId: master.id,
        baseFilePath: master.baseFilePath,
        lang,
        brand: master.brand,
        lockedFields: master.lockedFields as unknown as LockedFieldConfig[],
        editableFields: master.editableFields as unknown as TemplateFieldConfig[],
        fieldValues: saved.fieldValues as unknown as MultiLanguageFieldValues,
      })
      folder.file(`${lang}.html`, cleanHtml(transformer(html)))
    })
  )

  const failed = results.filter((r) => r.status === 'rejected')
  if (failed.length === activeLangs.length) {
    return apiError('No master HTML files found — upload template files first', 404)
  }

  const zipBuffer = await zip.generateAsync({ type: 'uint8array' })

  await activityService.log({
    action: 'HTML_DOWNLOADED',
    userId: session.user.id,
    userName: session.user.name ?? session.user.email ?? 'Unknown',
    savedTemplateId: saved.id,
    savedTemplateName: saved.name,
    htmlType: 'zip',
  })

  return new Response(zipBuffer.buffer as ArrayBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${folderName}.zip"`,
    },
  })
})
