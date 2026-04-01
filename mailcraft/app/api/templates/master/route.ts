import { apiError, apiSuccess, apiHandler, requireAuth, requireAdmin } from '@/lib/api'
import { createMasterTemplateSchema } from '@/lib/schemas'
import { getMasterTemplates, invalidateMasterTemplateListCache } from '@/lib/services/templateService'
import { redis, CacheKeys, CacheTTL } from '@/lib/redis'
import { prisma } from '@/lib/prisma'

function slugify(brand: string, name: string): string {
  const brandPart = brand.toLowerCase().replace(/\s+/g, '-')
  const namePart = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  return `${brandPart}-${namePart}`
}

function getBaseFilePath(brand: string, name: string): string {
  const templateBaseDir = process.env.TEMPLATE_BASE_DIR ?? './data/templates'
  const brandSlug = brand.toLowerCase()
  const nameSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  return `${templateBaseDir}/master-templates/${brandSlug}/${nameSlug}`
}

// GET /api/templates/master — list all active master templates
export const GET = apiHandler(async () => {
  const session = await requireAuth()
  if (!session) return apiError('Unauthorized', 401)

  // Try cache
  const cached = await redis.get(CacheKeys.masterTemplateList)
  if (cached) {
    const templates = JSON.parse(cached)
    // Strip lockedFields for non-admin
    if (session.user.role !== 'ADMIN') {
      return apiSuccess(templates.map((t: Record<string, unknown>) => ({ ...t, lockedFields: undefined })))
    }
    return apiSuccess(templates)
  }

  const templates = await getMasterTemplates()

  await redis.set(CacheKeys.masterTemplateList, JSON.stringify(templates), 'EX', CacheTTL.masterTemplateList)

  if (session.user.role !== 'ADMIN') {
    return apiSuccess(templates.map((t) => ({ ...t, lockedFields: undefined })))
  }
  return apiSuccess(templates)
})

// POST /api/templates/master — create a new master template (admin only)
export const POST = apiHandler(async (req) => {
  const session = await requireAdmin()
  if (!session) return apiError('Forbidden', 403)

  const body = await req.json()
  const parsed = createMasterTemplateSchema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.errors[0].message, 400)

  const { name, brand, description, editableFields, lockedFields } = parsed.data

  const slug = slugify(brand, name)
  const baseFilePath = getBaseFilePath(brand, name)

  const existing = await prisma.masterTemplate.findUnique({ where: { slug } })
  if (existing) return apiError('A template with this name already exists for this brand', 409)

  const template = await prisma.masterTemplate.create({
    data: {
      name,
      slug,
      brand,
      description,
      baseFilePath,
      editableFields: editableFields as object,
      lockedFields: lockedFields as object,
    },
  })

  await invalidateMasterTemplateListCache()

  return apiSuccess(template, 'Master template created', 201)
})
