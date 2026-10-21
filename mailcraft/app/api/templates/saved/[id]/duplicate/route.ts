import { apiError, apiSuccess, apiHandler } from '@/lib/api'
import { requireScope, ownedWhere, ownershipData, scopeUserName } from '@/lib/services/accessService'
import { prisma } from '@/lib/prisma'
import { getSavedTemplatePath } from '@/lib/services/fileService'
import * as activityService from '@/lib/services/activityService'

interface RouteContext {
  params: Promise<{ id: string }>
}

// POST /api/templates/saved/:id/duplicate — clone a saved template within the owning department/user
export const POST = apiHandler(async (_req, ctx) => {
  const scope = await requireScope()
  if (!scope) return apiError('Unauthorized', 401)

  const { id } = await (ctx as RouteContext).params

  const source = await prisma.savedTemplate.findFirst({
    where: { id, ...ownedWhere(scope) },
    include: { masterTemplate: { select: { name: true } } },
  })
  if (!source) return apiError('Template not found', 404)

  // Resolve a unique name: "Copy of X" → "Copy of X (2)" → "Copy of X (3)" …
  const baseName = `Copy of ${source.name}`
  const existing = await prisma.savedTemplate.findMany({
    where: { ...ownedWhere(scope), name: { startsWith: baseName } },
    select: { name: true },
  })
  const takenNames = new Set(existing.map((t) => t.name))
  let candidateName = baseName
  let counter = 2
  while (takenNames.has(candidateName)) {
    candidateName = `${baseName} (${counter})`
    counter++
  }

  const copy = await prisma.savedTemplate.create({
    data: {
      ...ownershipData(scope),
      lastEditedById: scope.userId,
      masterTemplateId: source.masterTemplateId,
      name: candidateName,
      fieldValues: source.fieldValues ?? {},
      sectionConfig: source.sectionConfig ?? [],
      // Keep MailCraft Blocks + their order; null (legacy) stays null via the column default
      ...(source.customBlocks !== null ? { customBlocks: source.customBlocks } : {}),
      ...(source.layoutOrder !== null ? { layoutOrder: source.layoutOrder } : {}),
      // Copy lands in the same folder as the source (folder is in the same scope as the source)
      ...(source.folderId ? { folderId: source.folderId } : {}),
    },
  })

  // Set renderedBasePath now that we have an ID (same pattern as createSavedTemplate)
  await prisma.savedTemplate.update({
    where: { id: copy.id },
    data: { renderedBasePath: getSavedTemplatePath(scope.userId, copy.id) },
  })

  await activityService.log({
    action: 'TEMPLATE_CLONED',
    userId: scope.userId,
    userName: scopeUserName(scope),
    savedTemplateId: copy.id,
    savedTemplateName: copy.name,
    masterTemplateName: source.masterTemplate.name,
  })

  return apiSuccess(copy, 'Template duplicated', 201)
})
