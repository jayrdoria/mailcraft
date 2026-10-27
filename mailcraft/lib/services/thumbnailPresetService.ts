import { Prisma, type Brand } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import type { PresetTexts, ThumbnailPreset } from '@/lib/types/thumbnailPreset'

// ─────────────────────────────────────────────
// Thumbnail presets — same permission as CTA presets (admins + canManageCtaPresets);
// see ctaPresetService.requireCtaPresetManager.
// ─────────────────────────────────────────────

export const thumbnailPresetSelect = {
  id: true,
  brand: true,
  kind: true,
  imageUrl: true,
  labels: true,
  sublabels: true,
  links: true,
  sortOrder: true,
} as const

export function listThumbnailPresets(brand?: Brand): Promise<ThumbnailPreset[]> {
  return prisma.thumbnailPreset.findMany({
    where: brand ? { brand } : undefined,
    select: thumbnailPresetSelect,
    orderBy: [{ brand: 'asc' }, { kind: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
  }) as unknown as Promise<ThumbnailPreset[]>
}

// Optional texts with every language empty are stored as NULL
export function optionalTexts(texts: PresetTexts | null | undefined): Prisma.InputJsonValue | typeof Prisma.DbNull {
  if (!texts || Object.values(texts).every((v) => v.trim() === '')) return Prisma.DbNull
  return texts
}
