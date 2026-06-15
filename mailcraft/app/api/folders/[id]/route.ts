import { apiError, apiSuccess, apiHandler, requireAuth } from '@/lib/api'
import { updateFolderSchema } from '@/lib/schemas'
import { prisma } from '@/lib/prisma'
import { deleteTemplateDir } from '@/lib/services/fileService'

interface RouteContext {
  params: Promise<{ id: string }>
}

// PATCH /api/folders/:id — rename folder
export const PATCH = apiHandler(async (req, ctx) => {
  const session = await requireAuth()
  if (!session) return apiError('Unauthorized', 401)

  const { id } = await (ctx as RouteContext).params

  const folder = await prisma.folder.findFirst({
    where: { id, userId: session.user.id },
  })
  if (!folder) return apiError('Folder not found', 404)

  const body = await req.json()
  const parsed = updateFolderSchema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.errors[0].message, 400)

  const { name } = parsed.data

  if (name !== folder.name) {
    const conflict = await prisma.folder.findFirst({
      where: { userId: session.user.id, name, NOT: { id } },
      select: { id: true },
    })
    if (conflict) return apiError('A folder with that name already exists', 409)
  }

  const updated = await prisma.folder.update({
    where: { id },
    data: { name },
  })

  return apiSuccess({ id: updated.id, name: updated.name })
})

// DELETE /api/folders/:id — delete folder and all templates inside it
export const DELETE = apiHandler(async (_req, ctx) => {
  const session = await requireAuth()
  if (!session) return apiError('Unauthorized', 401)

  const { id } = await (ctx as RouteContext).params

  const folder = await prisma.folder.findFirst({
    where: { id, userId: session.user.id },
    include: {
      templates: { select: { id: true, renderedBasePath: true } },
    },
  })
  if (!folder) return apiError('Folder not found', 404)

  const templateCount = folder.templates.length

  // Delete rendered HTML files from disk (best-effort, non-fatal)
  await Promise.allSettled(
    folder.templates
      .filter((t) => t.renderedBasePath)
      .map((t) => deleteTemplateDir(t.renderedBasePath!))
  )

  // Delete all templates in the folder (cascades SharedTemplate records)
  if (templateCount > 0) {
    await prisma.savedTemplate.deleteMany({
      where: { folderId: id, userId: session.user.id },
    })
  }

  // Delete the folder itself
  await prisma.folder.delete({ where: { id } })

  return apiSuccess({ id, templateCount }, 'Folder deleted')
})
