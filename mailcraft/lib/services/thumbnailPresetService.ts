import { Prisma, type Brand } from '@prisma/client'
import type { z } from 'zod'
import { prisma } from '@/lib/prisma'
import type { thumbnailPresetSchema } from '@/lib/schemas'
import { hasFrca, type PresetImages, type PresetTexts, type ThumbnailPreset } from '@/lib/types/thumbnailPreset'

// ─────────────────────────────────────────────
// Thumbnail presets — same permission as CTA presets (admins + canManageCtaPresets);
// see ctaPresetService.requireCtaPresetManager.
// ─────────────────────────────────────────────

export const thumbnailPresetSelect = {
  id: true,
  brand: true,
  kind: true,
  imageUrl: true,
  imageUrls: true,
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
  if (!texts || Object.values(texts).every((v) => (v ?? '').trim() === '')) return Prisma.DbNull
  return texts
}

// FRCA is kept only for brands that have it, and only when filled in (blank = FR text / template link)
function frcaFor<T extends PresetTexts | null | undefined>(texts: T, keep: boolean): T {
  if (!texts || texts.frca === undefined) return texts
  const { frca, ...rest } = texts
  return (keep && frca.trim() !== '' ? { ...rest, frca } : rest) as T
}

// Per-language images: blanks dropped (= main image); none left → NULL
function optionalImages(images: PresetImages | null | undefined, keepFrca: boolean): Prisma.InputJsonValue | typeof Prisma.DbNull {
  const kept = Object.entries(images ?? {}).filter(([lang, url]) => (url ?? '').trim() !== '' && (keepFrca || lang !== 'frca'))
  return kept.length ? Object.fromEntries(kept) : Prisma.DbNull
}

// Duplicate: same preset with " (Copy)" on every label, placed right after the original
const COPY_SUFFIX = ' (Copy)'
const LABEL_MAX = 100 // = thumbnailPresetSchema label max
const copyLabel = (label: string) => `${label.slice(0, LABEL_MAX - COPY_SUFFIX.length)}${COPY_SUFFIX}`

export async function duplicateThumbnailPreset(id: string): Promise<ThumbnailPreset | null> {
  return prisma.$transaction(async (tx) => {
    const src = await tx.thumbnailPreset.findUnique({ where: { id } })
    if (!src) return null
    const labels = Object.fromEntries(
      Object.entries(src.labels as PresetTexts).map(([lang, v]) => [lang, v && v.trim() ? copyLabel(v) : v])
    )
    // Make room right after the original; the rest of the group keeps its order
    await tx.thumbnailPreset.updateMany({
      where: { brand: src.brand, kind: src.kind, sortOrder: { gt: src.sortOrder } },
      data: { sortOrder: { increment: 1 } },
    })
    const copy = await tx.thumbnailPreset.create({
      data: {
        brand: src.brand,
        kind: src.kind,
        imageUrl: src.imageUrl,
        imageUrls: src.imageUrls ?? Prisma.DbNull,
        labels,
        sublabels: src.sublabels ?? Prisma.DbNull,
        links: src.links ?? Prisma.DbNull,
        sortOrder: src.sortOrder + 1,
      },
      select: thumbnailPresetSelect,
    })
    return copy as unknown as ThumbnailPreset
  })
}

// Create / update data from a validated body (POST + PATCH share it)
export function presetWriteData(input: z.infer<typeof thumbnailPresetSchema>) {
  const keepFrca = hasFrca(input.brand)
  return {
    brand: input.brand,
    kind: input.kind,
    imageUrl: input.imageUrl,
    imageUrls: optionalImages(input.imageUrls, keepFrca),
    labels: frcaFor(input.labels, keepFrca),
    sublabels: optionalTexts(frcaFor(input.sublabels, keepFrca)),
    links: optionalTexts(frcaFor(input.links, keepFrca)),
  }
}
