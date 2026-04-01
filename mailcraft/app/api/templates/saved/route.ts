import { apiError, apiSuccess, apiHandler, requireAuth } from '@/lib/api'
import { createSavedTemplateSchema } from '@/lib/schemas'
import { getMasterTemplateById, createSavedTemplate } from '@/lib/services/templateService'
import { renderAndSaveAllLanguages, buildSectionTransformer } from '@/lib/services/renderService'
import { prisma } from '@/lib/prisma'
import * as activityService from '@/lib/services/activityService'
import { LANGUAGES } from '@/lib/types/template'
import type {
  MultiLanguageFieldValues,
  SavedSectionConfig,
  LockedFieldConfig,
  TemplateFieldConfig,
} from '@/lib/types/template'

// GET /api/templates/saved — list current user's saved templates + shared with me
export const GET = apiHandler(async () => {
  const session = await requireAuth()
  if (!session) return apiError('Unauthorized', 401)

  const [own, shared] = await Promise.all([
    prisma.savedTemplate.findMany({
      where: { userId: session.user.id },
      include: {
        masterTemplate: { select: { id: true, name: true, brand: true, slug: true } },
      },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.sharedTemplate.findMany({
      where: { sharedWithId: session.user.id },
      include: {
        savedTemplate: {
          include: {
            masterTemplate: { select: { id: true, name: true, brand: true, slug: true } },
            user: { select: { id: true, name: true, department: true } },
          },
        },
        sharedBy: { select: { id: true, name: true, department: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  return apiSuccess({ own, shared })
})

// POST /api/templates/saved — clone a master template into a new saved template
export const POST = apiHandler(async (req) => {
  const session = await requireAuth()
  if (!session) return apiError('Unauthorized', 401)

  const body = await req.json()
  const parsed = createSavedTemplateSchema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.errors[0].message, 400)

  const { name, masterTemplateId, fieldValues, sectionConfig } = parsed.data

  const master = await getMasterTemplateById(masterTemplateId)
  if (!master || !master.isActive) return apiError('Master template not found', 404)

  // Build initial fieldValues: use provided values or fall back to field defaults
  const editableFields = master.editableFields as unknown as TemplateFieldConfig[]
  const initialFieldValues: MultiLanguageFieldValues = { en: {}, fr: {}, de: {}, it: {}, es: {} }

  for (const lang of LANGUAGES) {
    for (const field of editableFields) {
      const provided = fieldValues[lang]?.[field.key]
      if (provided !== undefined) {
        initialFieldValues[lang][field.key] = provided
      } else if (field.defaultValue !== undefined) {
        initialFieldValues[lang][field.key] = field.defaultValue
      }
    }
  }

  const saved = await createSavedTemplate({
    userId: session.user.id,
    masterTemplateId,
    name,
    fieldValues: initialFieldValues,
    sectionConfig: sectionConfig as SavedSectionConfig[],
  })

  // Render all languages to disk (best-effort — HTML files may not exist yet in dev)
  if (saved.renderedBasePath) {
    try {
      const transformer = buildSectionTransformer(saved.sectionConfig as unknown as SavedSectionConfig[])
      await Promise.all(
        LANGUAGES.map((lang) =>
          renderAndSaveAllLanguages({
            masterTemplateId: master.id,
            masterBaseFilePath: master.baseFilePath,
            savedBaseFilePath: saved.renderedBasePath!,
            lang,
            lockedFields: master.lockedFields as unknown as LockedFieldConfig[],
            editableFields,
            fieldValues: saved.fieldValues as unknown as MultiLanguageFieldValues,
            sectionTransformer: transformer,
          })
        )
      )
    } catch {
      // HTML files not yet on disk — OK in dev, will render on-demand via /html endpoint
    }
  }

  await activityService.log({
    action: 'TEMPLATE_CLONED',
    userId: session.user.id,
    userName: session.user.name ?? session.user.email ?? 'Unknown',
    savedTemplateId: saved.id,
    savedTemplateName: saved.name,
    masterTemplateName: master.name,
  })

  return apiSuccess(saved, 'Template cloned', 201)
})
