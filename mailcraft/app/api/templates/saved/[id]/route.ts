import { apiError, apiSuccess, apiHandler, requireAuth } from '@/lib/api'
import { updateSavedTemplateSchema } from '@/lib/schemas'
import { renderAndSaveAllLanguages, buildSectionTransformer } from '@/lib/services/renderService'
import { deleteTemplateDir } from '@/lib/services/fileService'
import { prisma } from '@/lib/prisma'
import * as activityService from '@/lib/services/activityService'
import { LANGUAGES } from '@/lib/types/template'
import type {
  MultiLanguageFieldValues,
  SavedSectionConfig,
  LockedFieldConfig,
  TemplateFieldConfig,
} from '@/lib/types/template'

interface RouteContext {
  params: Promise<{ id: string }>
}

async function getSavedForUser(id: string, userId: string, isAdmin: boolean) {
  if (isAdmin) {
    return prisma.savedTemplate.findFirst({
      where: { id },
      include: { masterTemplate: true },
    })
  }
  return prisma.savedTemplate.findFirst({
    where: {
      id,
      OR: [
        { userId },
        { sharedWith: { some: { sharedWithId: userId } } },
      ],
    },
    include: { masterTemplate: true },
  })
}

// GET /api/templates/saved/:id — get saved template (owner, shared-with, or admin)
export const GET = apiHandler(async (_req, ctx) => {
  const session = await requireAuth()
  if (!session) return apiError('Unauthorized', 401)

  const { id } = await (ctx as RouteContext).params
  const saved = await getSavedForUser(id, session.user.id, session.user.role === 'ADMIN')
  if (!saved) return apiError('Template not found', 404)

  return apiSuccess(saved)
})

// PATCH /api/templates/saved/:id — update name / fieldValues / sectionConfig (owner only)
export const PATCH = apiHandler(async (req, ctx) => {
  const session = await requireAuth()
  if (!session) return apiError('Unauthorized', 401)

  const { id } = await (ctx as RouteContext).params

  const existing = await prisma.savedTemplate.findFirst({
    where: { id, userId: session.user.id },
    include: { masterTemplate: true },
  })
  if (!existing) return apiError('Template not found', 404)

  const body = await req.json()
  const parsed = updateSavedTemplateSchema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.errors[0].message, 400)

  const { name, fieldValues, sectionConfig } = parsed.data

  const updated = await prisma.savedTemplate.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(fieldValues !== undefined ? { fieldValues: fieldValues as object } : {}),
      ...(sectionConfig !== undefined ? { sectionConfig: sectionConfig as object } : {}),
    },
    include: { masterTemplate: true },
  })

  // Re-render all languages to disk (best-effort)
  if (updated.renderedBasePath && (fieldValues !== undefined || sectionConfig !== undefined)) {
    const master = updated.masterTemplate
    const transformer = buildSectionTransformer(updated.sectionConfig as unknown as SavedSectionConfig[])
    try {
      await Promise.all(
        LANGUAGES.map((lang) =>
          renderAndSaveAllLanguages({
            masterTemplateId: master.id,
            masterBaseFilePath: master.baseFilePath,
            savedBaseFilePath: updated.renderedBasePath!,
            lang,
            brand: master.brand,
            lockedFields: master.lockedFields as unknown as LockedFieldConfig[],
            editableFields: master.editableFields as unknown as TemplateFieldConfig[],
            fieldValues: updated.fieldValues as unknown as MultiLanguageFieldValues,
            sectionTransformer: transformer,
          })
        )
      )
    } catch {
      // HTML files may not exist yet in dev — OK
    }
  }

  await activityService.log({
    action: 'TEMPLATE_SAVED',
    userId: session.user.id,
    userName: session.user.name ?? session.user.email ?? 'Unknown',
    savedTemplateId: updated.id,
    savedTemplateName: updated.name,
    masterTemplateName: existing.masterTemplate.name,
  })

  return apiSuccess(updated)
})

// DELETE /api/templates/saved/:id — delete template + rendered files (owner or admin)
export const DELETE = apiHandler(async (_req, ctx) => {
  const session = await requireAuth()
  if (!session) return apiError('Unauthorized', 401)

  const { id } = await (ctx as RouteContext).params

  const where =
    session.user.role === 'ADMIN' ? { id } : { id, userId: session.user.id }

  const existing = await prisma.savedTemplate.findFirst({
    where,
    include: { masterTemplate: true },
  })
  if (!existing) return apiError('Template not found', 404)

  // Delete DB record (cascades SharedTemplate)
  await prisma.savedTemplate.delete({ where: { id } })

  // Clean up rendered files from disk
  if (existing.renderedBasePath) {
    try {
      await deleteTemplateDir(existing.renderedBasePath)
    } catch {
      // Non-fatal — files may not exist
    }
  }

  await activityService.log({
    action: 'TEMPLATE_DELETED',
    userId: session.user.id,
    userName: session.user.name ?? session.user.email ?? 'Unknown',
    savedTemplateId: id,
    savedTemplateName: existing.name,
    masterTemplateName: existing.masterTemplate.name,
  })

  return apiSuccess({ id }, 'Template deleted')
})
