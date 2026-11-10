import type { Language } from '@/lib/types/template'

// ─────────────────────────────────────────────
// THUMBNAIL PRESETS — quick picks for a template's thumbnail slots, per brand
// ─────────────────────────────────────────────

/** Languages a preset always stores text for. FRCA is optional (Stakes only) — see PresetTexts.frca. */
export type PresetLanguage = 'en' | 'fr' | 'de' | 'it' | 'es'
export const PRESET_LANGUAGES: PresetLanguage[] = ['en', 'fr', 'de', 'it', 'es']

/**
 * Per-language texts. `frca` is optional and only kept for brands in FRCA_PRESET_BRANDS:
 * blank label / sublabel → FR text; blank link → the template keeps its own FRCA link
 * (FR and FRCA links differ, e.g. stakes3.com vs stakes.com).
 */
export type PresetTexts = Record<PresetLanguage, string> & { frca?: string }

/** Optional per-language image overrides; a missing / blank language uses the main imageUrl */
export type PresetImages = Partial<Record<Language, string>>

export const PRESET_BRANDS = ['STAKES', 'STAKES_CASINO', 'X7', 'X7_V2'] as const
export type PresetBrand = (typeof PRESET_BRANDS)[number]
export const PRESET_BRAND_LABELS: Record<PresetBrand, string> = {
  STAKES: 'Stakes',
  STAKES_CASINO: 'Stakes Casino',
  X7: 'X7 Casino',
  X7_V2: 'X7 Casino V2',
}

/** Brands whose templates have an FRCA language — the only ones that keep FRCA preset values */
export const FRCA_PRESET_BRANDS: readonly PresetBrand[] = ['STAKES']
export const hasFrca = (brand: PresetBrand): boolean => FRCA_PRESET_BRANDS.includes(brand)

/** Languages that can get their own image (besides the main one), in tab order. Stakes Casino is EN only. */
export function presetImageLanguages(brand: PresetBrand): Language[] {
  if (brand === 'STAKES_CASINO') return []
  return hasFrca(brand) ? ['fr', 'frca', 'de', 'it', 'es'] : ['fr', 'de', 'it', 'es']
}

/** card → THUMBn_* slots (every brand); icon → ICONn_* slots (X7 V2 Icons design only) */
export const PRESET_KINDS = ['card', 'icon'] as const
export type PresetKind = (typeof PRESET_KINDS)[number]

export interface ThumbnailPreset {
  id: string
  brand: PresetBrand
  kind: PresetKind
  imageUrl: string
  imageUrls?: PresetImages | null
  labels: PresetTexts
  sublabels: PresetTexts | null
  links: PresetTexts | null
  sortOrder: number
}

// Image for a language: its own override if set, else (FRCA) the FR override, else the main image
export function presetImage(preset: Pick<ThumbnailPreset, 'imageUrl' | 'imageUrls'>, lang: Language): string {
  const own = preset.imageUrls?.[lang]?.trim()
  if (own) return own
  const fr = lang === 'frca' ? preset.imageUrls?.fr?.trim() : ''
  return fr || preset.imageUrl
}

// Link for a language. FRCA never borrows the FR link (different domain) — blank means "keep the template's".
export function presetLink(links: PresetTexts | null | undefined, lang: Language): string {
  if (!links) return ''
  return (lang === 'frca' ? links.frca : links[lang]) ?? ''
}

// Label / sublabel text for a language (FRCA → its own text if set, else FR)
export function presetText(texts: PresetTexts | null | undefined, lang: Language): string {
  if (!texts) return ''
  if (lang === 'frca') return (texts.frca?.trim() ? texts.frca : texts.fr) ?? ''
  return texts[lang] ?? ''
}
