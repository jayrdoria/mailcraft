import { NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { apiError, apiSuccess, apiHandler } from '@/lib/api'
import { requireScope, ownedWhere, readableTemplateWhere, scopeUserName } from '@/lib/services/accessService'
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
import type { CustomBlock, LayoutOrder } from '@/lib/types/blocks'

interface RouteContext {
  params: Promise<{ id: string }>
}

// GET /api/templates/saved/:id — get saved template (owning department/user, shared-with, or admin)
export const GET = apiHandler(async (_req, ctx) => {
  const scope = await requireScope()
  if (!scope) return apiError('Unauthorized', 401)

  const { id } = await (ctx as RouteContext).params
  const saved = await prisma.savedTemplate.findFirst({
    where: { id, ...readableTemplateWhere(scope) },
    include: { masterTemplate: true },
  })
  if (!saved) return apiError('Template not found', 404)

  return apiSuccess(saved)
})

// PATCH /api/templates/saved/:id — update name / fieldValues / sectionConfig (owning department/user only)
export const PATCH = apiHandler(async (req, ctx) => {
  const scope = await requireScope()
  if (!scope) return apiError('Unauthorized', 401)

  const { id } = await (ctx as RouteContext).params

  const existing = await prisma.savedTemplate.findFirst({
    where: { id, ...ownedWhere(scope) },
    include: { masterTemplate: true },
  })
  if (!existing) return apiError('Template not found', 404)

  const body = await req.json()
  const parsed = updateSavedTemplateSchema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.errors[0].message, 400)

  const { name, fieldValues, sectionConfig, customBlocks, layoutOrder, folderId, expectedUpdatedAt } = parsed.data

  // Reject duplicate names (only when name is actually changing)
  if (name !== undefined && name !== existing.name) {
    const nameConflict = await prisma.savedTemplate.findFirst({
      where: { ...ownedWhere(scope), name, NOT: { id } },
      select: { id: true },
    })
    if (nameConflict) return apiError('A template with that name already exists', 409)
  }

  // Verify folderId belongs to the same scope (when provided and non-null)
  if (folderId) {
    const folder = await prisma.folder.findFirst({
      where: { id: folderId, ...ownedWhere(scope) },
      select: { id: true },
    })
    if (!folder) return apiError('Folder not found', 404)
  }

  // Folder-only moves are reorganisation, not edits — they don't change "last edited by"
  const isContentChange =
    name !== undefined ||
    fieldValues !== undefined ||
    sectionConfig !== undefined ||
    customBlocks !== undefined ||
    layoutOrder !== undefined

  const data: Prisma.SavedTemplateUncheckedUpdateManyInput = {
    ...(name !== undefined ? { name } : {}),
    ...(fieldValues !== undefined ? { fieldValues: fieldValues as object } : {}),
    ...(sectionConfig !== undefined ? { sectionConfig: sectionConfig as object } : {}),
    ...(customBlocks !== undefined ? { customBlocks: customBlocks as object } : {}),
    ...(layoutOrder !== undefined ? { layoutOrder: layoutOrder as object } : {}),
    ...(folderId !== undefined ? { folderId } : {}),
    ...(isContentChange ? { lastEditedById: scope.userId } : {}),
  }

  // Optimistic concurrency: the editor sends the updatedAt it loaded. If anyone saved
  // since, refuse (atomically) instead of silently overwriting their changes.
  if (expectedUpdatedAt) {
    const { count } = await prisma.savedTemplate.updateMany({
      where: { id, updatedAt: new Date(expectedUpdatedAt) },
      data,
    })
    if (count === 0) {
      const current = await prisma.savedTemplate.findUnique({
        where: { id },
        select: { updatedAt: true, lastEditedBy: { select: { email: true } } },
      })
      return NextResponse.json(
        {
          error: 'This template was changed by someone else since you opened it. Reload to get the latest version.',
          code: 'STALE_WRITE',
          updatedAt: current?.updatedAt ?? null,
          updatedBy: current?.lastEditedBy?.email ?? null,
        },
        { status: 409 }
      )
    }
  }

  const updated = expectedUpdatedAt
    ? await prisma.savedTemplate.findUniqueOrThrow({ where: { id }, include: { masterTemplate: true } })
    : await prisma.savedTemplate.update({ where: { id }, data, include: { masterTemplate: true } })

  // Re-render all languages to disk (best-effort)
  if (updated.renderedBasePath && (fieldValues !== undefined || sectionConfig !== undefined)) {
    const master = updated.masterTemplate
    const transformer = buildSectionTransformer(
      updated.sectionConfig as unknown as SavedSectionConfig[],
      {
        customBlocks: updated.customBlocks as unknown as CustomBlock[] | null,
        layoutOrder: updated.layoutOrder as unknown as LayoutOrder | null,
        brand: master.brand,
      }
    )
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

  // Only log content saves — not folder-only reorganisation
  if (isContentChange) {
    await activityService.log({
      action: 'TEMPLATE_SAVED',
      userId: scope.userId,
      userName: scopeUserName(scope),
      savedTemplateId: updated.id,
      savedTemplateName: updated.name,
      masterTemplateName: existing.masterTemplate.name,
    })
  }

  return apiSuccess(updated)
})

// DELETE /api/templates/saved/:id — delete template + rendered files (owning department/user or admin)
export const DELETE = apiHandler(async (_req, ctx) => {
  const scope = await requireScope()
  if (!scope) return apiError('Unauthorized', 401)

  const { id } = await (ctx as RouteContext).params

  const where = scope.isAdmin ? { id } : { id, ...ownedWhere(scope) }

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

  // For imported templates: also delete the hidden MasterTemplate + its HTML files.
  // Only runs when the master was imported by this user or a member of their department — never affects regular templates.
  const masterRaw = existing.masterTemplate as unknown as { isImported?: boolean; importedBy?: string }
  if (masterRaw.isImported === true && masterRaw.importedBy && scope.memberIds.includes(masterRaw.importedBy)) {
    const otherSaved = await prisma.savedTemplate.count({
      where: { masterTemplateId: existing.masterTemplateId },
    })
    if (otherSaved === 0) {
      await prisma.masterTemplate.delete({ where: { id: existing.masterTemplateId } })
      try {
        await deleteTemplateDir(existing.masterTemplate.baseFilePath)
      } catch {
        // Non-fatal — files may not exist
      }
    }
  }

  await activityService.log({
    action: 'TEMPLATE_DELETED',
    userId: scope.userId,
    userName: scopeUserName(scope),
    savedTemplateId: id,
    savedTemplateName: existing.name,
    masterTemplateName: existing.masterTemplate.name,
  })

  return apiSuccess({ id }, 'Template deleted')
})
