import type { Language } from '@/lib/types/template'

// ─────────────────────────────────────────────
// THUMBNAIL PRESETS — quick picks for a template's thumbnail slots, per brand
// ─────────────────────────────────────────────

/** Languages a preset stores text for. FRCA has no entry — it uses FR. */
export type PresetLanguage = 'en' | 'fr' | 'de' | 'it' | 'es'
export const PRESET_LANGUAGES: PresetLanguage[] = ['en', 'fr', 'de', 'it', 'es']

export type PresetTexts = Record<PresetLanguage, string>

export const PRESET_BRANDS = ['STAKES', 'STAKES_CASINO', 'X7', 'X7_V2'] as const
export type PresetBrand = (typeof PRESET_BRANDS)[number]
export const PRESET_BRAND_LABELS: Record<PresetBrand, string> = {
  STAKES: 'Stakes',
  STAKES_CASINO: 'Stakes Casino',
  X7: 'X7 Casino',
  X7_V2: 'X7 Casino V2',
}

/** card → THUMBn_* slots (every brand); icon → ICONn_* slots (X7 V2 Icons design only) */
export const PRESET_KINDS = ['card', 'icon'] as const
export type PresetKind = (typeof PRESET_KINDS)[number]

export interface ThumbnailPreset {
  id: string
  brand: PresetBrand
  kind: PresetKind
  imageUrl: string
  labels: PresetTexts
  sublabels: PresetTexts | null
  links: PresetTexts | null
  sortOrder: number
}

export function presetText(texts: PresetTexts | null | undefined, lang: Language): string {
  if (!texts) return ''
  return (lang === 'frca' ? texts.fr : texts[lang]) ?? ''
}
