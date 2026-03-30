import { prisma } from '@/lib/prisma'
import type { MultiLanguageFieldValues, SavedSectionConfig } from '@/lib/types/template'
import { getSavedTemplatePath } from '@/lib/services/fileService'
import { redis, CacheKeys } from '@/lib/redis'

// ─────────────────────────────────────────────
// Master Templates
// ─────────────────────────────────────────────

export async function getMasterTemplates(brand?: 'STAKES' | 'X7') {
  return prisma.masterTemplate.findMany({
    where: {
      isActive: true,
      ...(brand ? { brand } : {}),
    },
    orderBy: [{ brand: 'asc' }, { name: 'asc' }],
  })
}

export async function getMasterTemplateById(id: string) {
  return prisma.masterTemplate.findUnique({ where: { id } })
}

export async function getMasterTemplateBySlug(slug: string) {
  return prisma.masterTemplate.findUnique({ where: { slug } })
}

// ─────────────────────────────────────────────
// Saved Templates
// ─────────────────────────────────────────────

export async function getUserSavedTemplates(userId: string) {
  return prisma.savedTemplate.findMany({
    where: { userId },
    include: {
      masterTemplate: {
        select: { id: true, name: true, brand: true, slug: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
  })
}

export async function getSavedTemplateById(id: string, userId: string) {
  return prisma.savedTemplate.findFirst({
    where: { id, userId },
    include: {
      masterTemplate: true,
    },
  })
}

export async function createSavedTemplate(params: {
  userId: string
  masterTemplateId: string
  name: string
  fieldValues: MultiLanguageFieldValues
  sectionConfig: SavedSectionConfig[]
}) {
  const { userId, masterTemplateId, name, fieldValues, sectionConfig } = params

  const saved = await prisma.savedTemplate.create({
    data: {
      userId,
      masterTemplateId,
      name,
      fieldValues: fieldValues as object,
      sectionConfig: sectionConfig as object,
    },
  })

  // Update renderedBasePath now that we have an ID
  const renderedBasePath = getSavedTemplatePath(userId, saved.id)
  return prisma.savedTemplate.update({
    where: { id: saved.id },
    data: { renderedBasePath },
  })
}

export async function updateSavedTemplate(params: {
  id: string
  userId: string
  name?: string
  fieldValues?: MultiLanguageFieldValues
  sectionConfig?: SavedSectionConfig[]
}) {
  const { id, name, fieldValues, sectionConfig } = params

  return prisma.savedTemplate.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(fieldValues !== undefined ? { fieldValues: fieldValues as object } : {}),
      ...(sectionConfig !== undefined ? { sectionConfig: sectionConfig as object } : {}),
    },
  })
}

export async function deleteSavedTemplate(id: string, userId: string) {
  return prisma.savedTemplate.deleteMany({
    where: { id, userId },
  })
}

// ─────────────────────────────────────────────
// Admin: invalidate master template list cache on changes
// ─────────────────────────────────────────────

export async function invalidateMasterTemplateListCache(): Promise<void> {
  await redis.del(CacheKeys.masterTemplateList)
}
