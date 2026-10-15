import { Prisma } from '@prisma/client'
import { apiError, apiSuccess, apiHandler } from '@/lib/api'
import { requireScope, ownedWhere } from '@/lib/services/accessService'
import { updateFolderSchema } from '@/lib/schemas'
import { prisma } from '@/lib/prisma'
import { deleteTemplateDir } from '@/lib/services/fileService'

interface RouteContext {
  params: Promise<{ id: string }>
}

// PATCH /api/folders/:id — rename folder
export const PATCH = apiHandler(async (req, ctx) => {
  const scope = await requireScope()
  if (!scope) return apiError('Unauthorized', 401)

  const { id } = await (ctx as RouteContext).params

  const folder = await prisma.folder.findFirst({
    where: { id, ...ownedWhere(scope) },
  })
  if (!folder) return apiError('Folder not found', 404)

  const body = await req.json()
  const parsed = updateFolderSchema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.errors[0].message, 400)

  const { name } = parsed.data

  if (name !== folder.name) {
    const conflict = await prisma.folder.findFirst({
      where: { ...ownedWhere(scope), name, NOT: { id } },
      select: { id: true },
    })
    if (conflict) return apiError('A folder with that name already exists', 409)
  }

  let updated
  try {
    updated = await prisma.folder.update({
      where: { id },
      data: { name },
    })
  } catch (err) {
    // @@unique([userId, name]) is per creator — see POST /api/folders
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return apiError('The folder creator already has a folder with that name in another department', 409)
    }
    throw err
  }

  return apiSuccess({ id: updated.id, name: updated.name })
})

// DELETE /api/folders/:id — delete folder and all templates inside it
export const DELETE = apiHandler(async (_req, ctx) => {
  const scope = await requireScope()
  if (!scope) return apiError('Unauthorized', 401)

  const { id } = await (ctx as RouteContext).params

  const folder = await prisma.folder.findFirst({
    where: { id, ...ownedWhere(scope) },
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
      where: { folderId: id, ...ownedWhere(scope) },
    })
  }

  // Delete the folder itself
  await prisma.folder.delete({ where: { id } })

  return apiSuccess({ id, templateCount }, 'Folder deleted')
})
