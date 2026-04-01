import { apiError, apiSuccess, apiHandler, requireAuth } from '@/lib/api'
import { toggleSectionSchema, deleteSectionSchema } from '@/lib/schemas'
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

interface RouteContext {
  params: Promise<{ savedId: string }>
}

async function rerender(saved: {
  renderedBasePath: string | null
  masterTemplate: {
    id: string
    baseFilePath: string
    lockedFields: unknown
    editableFields: unknown
  }
  fieldValues: unknown
  sectionConfig: unknown
}) {
  if (!saved.renderedBasePath) return
  const transformer = buildSectionTransformer(saved.sectionConfig as unknown as SavedSectionConfig[])
  try {
    await Promise.all(
      LANGUAGES.map((lang) =>
        renderAndSaveAllLanguages({
          masterTemplateId: saved.masterTemplate.id,
          masterBaseFilePath: saved.masterTemplate.baseFilePath,
          savedBaseFilePath: saved.renderedBasePath!,
          lang,
          lockedFields: saved.masterTemplate.lockedFields as unknown as LockedFieldConfig[],
          editableFields: saved.masterTemplate.editableFields as unknown as TemplateFieldConfig[],
          fieldValues: saved.fieldValues as unknown as MultiLanguageFieldValues,
          sectionTransformer: transformer,
        })
      )
    )
  } catch {
    // HTML files may not exist yet in dev — OK
  }
}

// PATCH /api/sections/:savedId — toggle a section on or off
export const PATCH = apiHandler(async (req, ctx) => {
  const session = await requireAuth()
  if (!session) return apiError('Unauthorized', 401)

  const { savedId } = await (ctx as RouteContext).params

  const saved = await prisma.savedTemplate.findFirst({
    where: { id: savedId, userId: session.user.id },
    include: { masterTemplate: true },
  })
  if (!saved) return apiError('Template not found', 404)

  const body = await req.json()
  const parsed = toggleSectionSchema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.errors[0].message, 400)

  const { sectionName, action } = parsed.data

  const currentConfig = saved.sectionConfig as unknown as SavedSectionConfig[]
  const existing = currentConfig.find((s) => s.name === sectionName)

  let newConfig: SavedSectionConfig[]
  if (existing) {
    newConfig = currentConfig.map((s) =>
      s.name === sectionName ? { ...s, isActive: action === 'enable', isDeleted: false } : s
    )
  } else {
    newConfig = [
      ...currentConfig,
      {
        name: sectionName,
        label: sectionName.charAt(0).toUpperCase() + sectionName.slice(1).toLowerCase(),
        isActive: action === 'enable',
        isDeleted: false,
      },
    ]
  }

  const updated = await prisma.savedTemplate.update({
    where: { id: savedId },
    data: { sectionConfig: newConfig as unknown as object[] },
    include: { masterTemplate: true },
  })

  await rerender(updated)

  return apiSuccess({ sectionConfig: newConfig }, `Section ${action}d`)
})

// DELETE /api/sections/:savedId — permanently delete a section
export const DELETE = apiHandler(async (req, ctx) => {
  const session = await requireAuth()
  if (!session) return apiError('Unauthorized', 401)

  const { savedId } = await (ctx as RouteContext).params

  const saved = await prisma.savedTemplate.findFirst({
    where: { id: savedId, userId: session.user.id },
    include: { masterTemplate: true },
  })
  if (!saved) return apiError('Template not found', 404)

  const body = await req.json()
  const parsed = deleteSectionSchema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.errors[0].message, 400)

  const { sectionName } = parsed.data

  const currentConfig = saved.sectionConfig as unknown as SavedSectionConfig[]
  const existing = currentConfig.find((s) => s.name === sectionName)

  let newConfig: SavedSectionConfig[]
  if (existing) {
    newConfig = currentConfig.map((s) =>
      s.name === sectionName ? { ...s, isActive: false, isDeleted: true } : s
    )
  } else {
    newConfig = [
      ...currentConfig,
      {
        name: sectionName,
        label: sectionName.charAt(0).toUpperCase() + sectionName.slice(1).toLowerCase(),
        isActive: false,
        isDeleted: true,
      },
    ]
  }

  const updated = await prisma.savedTemplate.update({
    where: { id: savedId },
    data: { sectionConfig: newConfig as unknown as object[] },
    include: { masterTemplate: true },
  })

  await rerender(updated)

  await activityService.log({
    action: 'SECTION_DELETED',
    userId: session.user.id,
    userName: session.user.name ?? session.user.email ?? 'Unknown',
    savedTemplateId: savedId,
    savedTemplateName: saved.name,
    sectionName,
  })

  return apiSuccess({ sectionConfig: newConfig }, 'Section permanently deleted')
})
