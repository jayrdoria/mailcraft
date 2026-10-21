import type { Language } from '@/lib/types/template'

// ─────────────────────────────────────────────
// CTA PRESETS — dropdown options for the CTA Button Text field
// ─────────────────────────────────────────────

/** Languages a preset stores text for. FRCA has no column — it uses FR. */
export type CtaPresetLanguage = 'en' | 'fr' | 'de' | 'it' | 'es'
export const CTA_PRESET_LANGUAGES: CtaPresetLanguage[] = ['en', 'fr', 'de', 'it', 'es']

export interface CtaPreset {
  id: string
  en: string
  fr: string
  de: string
  it: string
  es: string
  sortOrder: number
}

/** Field key that gets the preset dropdown in the editor */
export const CTA_PRESET_FIELD_KEY = 'CTA_TEXT'

export function ctaPresetText(preset: CtaPreset, lang: Language): string {
  return lang === 'frca' ? preset.fr : preset[lang]
}
