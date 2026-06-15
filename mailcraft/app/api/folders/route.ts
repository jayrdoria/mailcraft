import { apiError, apiSuccess, apiHandler, requireAuth } from '@/lib/api'
import { createFolderSchema } from '@/lib/schemas'
import { prisma } from '@/lib/prisma'

// GET /api/folders — list current user's folders with template count
export const GET = apiHandler(async () => {
  const session = await requireAuth()
  if (!session) return apiError('Unauthorized', 401)

  const folders = await prisma.folder.findMany({
    where: { userId: session.user.id },
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
  const session = await requireAuth()
  if (!session) return apiError('Unauthorized', 401)

  const body = await req.json()
  const parsed = createFolderSchema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.errors[0].message, 400)

  const { name } = parsed.data

  const conflict = await prisma.folder.findFirst({
    where: { userId: session.user.id, name },
    select: { id: true },
  })
  if (conflict) return apiError('A folder with that name already exists', 409)

  const folder = await prisma.folder.create({
    data: { name, userId: session.user.id },
  })

  return apiSuccess({ id: folder.id, name: folder.name, templateCount: 0, createdAt: folder.createdAt, updatedAt: folder.updatedAt }, 'Folder created', 201)
})
