import { Prisma } from '@prisma/client'
import { apiError, apiSuccess, apiHandler } from '@/lib/api'
import { requireScope, ownedWhere, ownershipData } from '@/lib/services/accessService'
import { createFolderSchema } from '@/lib/schemas'
import { prisma } from '@/lib/prisma'

// GET /api/folders — list folders of the current user (or their department) with template count
export const GET = apiHandler(async () => {
  const scope = await requireScope()
  if (!scope) return apiError('Unauthorized', 401)

  const folders = await prisma.folder.findMany({
    where: ownedWhere(scope),
    include: { _count: { select: { templates: true } } },
    orderBy: { createdAt: 'asc' },
  })

  return apiSuccess(
    folders.map((f) => ({
      id: f.id,
      name: f.name,
      templateCount: f._count.templates,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
    }))
  )
})

// POST /api/folders — create a folder
export const POST = apiHandler(async (req) => {
  const scope = await requireScope()
  if (!scope) return apiError('Unauthorized', 401)

  const body = await req.json()
  const parsed = createFolderSchema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.errors[0].message, 400)

  const { name } = parsed.data

  const conflict = await prisma.folder.findFirst({
    where: { ...ownedWhere(scope), name },
    select: { id: true },
  })
  if (conflict) return apiError('A folder with that name already exists', 409)

  let folder
  try {
    folder = await prisma.folder.create({
      data: { name, ...ownershipData(scope) },
    })
  } catch (err) {
    // @@unique([userId, name]) is per creator: it can still hit a folder this account
    // created while it belonged to another department
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return apiError('You already created a folder with that name in another department', 409)
    }
    throw err
  }

  return apiSuccess({ id: folder.id, name: folder.name, templateCount: 0, createdAt: folder.createdAt, updatedAt: folder.updatedAt }, 'Folder created', 201)
})
