import { apiError, apiSuccess, apiHandler, requireAuth, requireAdmin } from '@/lib/api'
import { updateMasterTemplateSchema } from '@/lib/schemas'
import {
  getMasterTemplateById,
  invalidateMasterTemplateListCache,
} from '@/lib/services/templateService'
import { invalidateMasterTemplateCache } from '@/lib/services/renderService'
import { prisma } from '@/lib/prisma'

interface RouteContext {
  params: Promise<{ id: string }>
}

// GET /api/templates/master/:id — get a master template by ID
export const GET = apiHandler(async (_req, ctx) => {
  const session = await requireAuth()
  if (!session) return apiError('Unauthorized', 401)

  const { id } = await (ctx as RouteContext).params
  const template = await getMasterTemplateById(id)
  if (!template || !template.isActive) return apiError('Template not found', 404)

  if (session.user.role !== 'ADMIN') {
    const { lockedFields: _lf, ...rest } = template
    return apiSuccess(rest)
  }
  return apiSuccess(template)
})

// PATCH /api/templates/master/:id — update a master template (admin only)
export const PATCH = apiHandler(async (req, ctx) => {
  const session = await requireAdmin()
  if (!session) return apiError('Forbidden', 403)

  const { id } = await (ctx as RouteContext).params
  const existing = await getMasterTemplateById(id)
  if (!existing) return apiError('Template not found', 404)

  const body = await req.json()
  const parsed = updateMasterTemplateSchema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.errors[0].message, 400)

  const { name, description, editableFields, lockedFields } = parsed.data

  const updated = await prisma.masterTemplate.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(editableFields !== undefined ? { editableFields: editableFields as object } : {}),
      ...(lockedFields !== undefined ? { lockedFields: lockedFields as object } : {}),
    },
  })

  await Promise.all([
    invalidateMasterTemplateListCache(),
    invalidateMasterTemplateCache(id),
  ])

  return apiSuccess(updated)
})

// DELETE /api/templates/master/:id — soft-delete (set isActive=false) (admin only)
export const DELETE = apiHandler(async (_req, ctx) => {
  const session = await requireAdmin()
  if (!session) return apiError('Forbidden', 403)

  const { id } = await (ctx as RouteContext).params
  const existing = await getMasterTemplateById(id)
  if (!existing) return apiError('Template not found', 404)

  await prisma.masterTemplate.update({
    where: { id },
    data: { isActive: false },
  })

  await Promise.all([
    invalidateMasterTemplateListCache(),
    invalidateMasterTemplateCache(id),
  ])

  return apiSuccess({ id }, 'Master template deactivated')
})
