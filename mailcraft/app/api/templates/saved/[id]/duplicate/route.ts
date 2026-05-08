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

  const copy = await prisma.savedTemplate.create({
    data: {
      userId: session.user.id,
      masterTemplateId: source.masterTemplateId,
      name: `Copy of ${source.name}`,
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
