import { apiError, apiSuccess, apiHandler, requireAdmin } from '@/lib/api'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rateLimit'
import { updateMasterLinksSchema } from '@/lib/schemas'
import * as activityService from '@/lib/services/activityService'
import { LinkEditError, listLinkSlots, updateMasterLinks } from '@/lib/services/masterLinkService'

interface RouteContext {
  params: Promise<{ id: string }>
}

const view = (m: { id: string; name: string; slug: string; brand: string; languages: unknown; updatedAt: Date } & Parameters<typeof listLinkSlots>[0]) => ({
  id: m.id,
  name: m.name,
  slug: m.slug,
  brand: m.brand,
  languages: m.languages,
  updatedAt: m.updatedAt.toISOString(),
  links: listLinkSlots(m),
})

// GET /api/admin/master-templates/:id/links — every link of a master, one slot per language (admin only)
export const GET = apiHandler(async (_req, ctx) => {
  const session = await requireAdmin()
  if (!session) return apiError('Forbidden', 403)

  const { id } = await (ctx as RouteContext).params
  const master = await prisma.masterTemplate.findUnique({ where: { id } })
  if (!master) return apiError('Master template not found', 404)

  return apiSuccess(view(master))
})

// PUT /api/admin/master-templates/:id/links — edit links and/or bulk find → replace.
// Changes reach NEW templates and duplicates only; existing templates keep their links.
export const PUT = apiHandler(async (req, ctx) => {
  const session = await requireAdmin()
  if (!session) return apiError('Forbidden', 403)

  if (await rateLimit(`master-links:${session.user.id}`, 30, 60)) {
    return apiError('Too many requests — try again in a minute', 429)
  }

  const { id } = await (ctx as RouteContext).params
  const body = await req.json().catch(() => null)
  const parsed = updateMasterLinksSchema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.errors[0]?.message ?? 'Invalid request', 400)

  try {
    const { master, changed } = await updateMasterLinks({ masterId: id, ...parsed.data })
    if (changed > 0) {
      await activityService.log({
        action: 'MASTER_LINKS_UPDATED',
        userId: session.user.id,
        userName: session.user.name ?? session.user.email ?? 'Admin',
        masterTemplateName: master.name,
      })
    }
    return apiSuccess({ ...view(master), changed }, changed > 0 ? `${changed} link(s) updated` : 'No links changed')
  } catch (e) {
    if (e instanceof LinkEditError) {
      const status = e.code === 'STALE' ? 409 : e.code === 'NOT_FOUND' ? 404 : 400
      return apiError(e.message, status)
    }
    throw e
  }
})
