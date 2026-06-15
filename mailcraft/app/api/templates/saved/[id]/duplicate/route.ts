import { apiError, apiSuccess, apiHandler, requireAuth } from '@/lib/api'
import { prisma } from '@/lib/prisma'
import { getSavedTemplatePath } from '@/lib/services/fileService'
import * as activityService from '@/lib/services/activityService'

interface RouteContext {
  params: Promise<{ id: string }>
}

// POST /api/templates/saved/:id/duplicate — clone a saved template for the current user
export const POST = apiHandler(async (_req, ctx) => {
  const session = await requireAuth()
  if (!session) return apiError('Unauthorized', 401)

  const { id } = await (ctx as RouteContext).params

  const source = await prisma.savedTemplate.findFirst({
    where: { id, userId: session.user.id },
    include: { masterTemplate: { select: { name: true } } },
  })
  if (!source) return apiError('Template not found', 404)

  // Resolve a unique name: "Copy of X" → "Copy of X (2)" → "Copy of X (3)" …
  const baseName = `Copy of ${source.name}`
  const existing = await prisma.savedTemplate.findMany({
    where: { userId: session.user.id, name: { startsWith: baseName } },
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
      userId: session.user.id,
      masterTemplateId: source.masterTemplateId,
      name: candidateName,
      fieldValues: source.fieldValues ?? {},
      sectionConfig: source.sectionConfig ?? [],
    },
  })

  // Set renderedBasePath now that we have an ID (same pattern as createSavedTemplate)
  await prisma.savedTemplate.update({
    where: { id: copy.id },
    data: { renderedBasePath: getSavedTemplatePath(session.user.id, copy.id) },
  })

  await activityService.log({
    action: 'TEMPLATE_CLONED',
    userId: session.user.id,
    userName: session.user.name ?? session.user.email ?? 'Unknown',
    savedTemplateId: copy.id,
    savedTemplateName: copy.name,
    masterTemplateName: source.masterTemplate.name,
  })

  return apiSuccess(copy, 'Template duplicated', 201)
})
