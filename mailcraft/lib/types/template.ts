// ─────────────────────────────────────────────
// FIELD TYPES
// ─────────────────────────────────────────────

export type TemplateFieldType = 'url' | 'text' | 'richtext' | 'link'

// ─────────────────────────────────────────────
// EDITABLE FIELDS — shown in editor to users
// ─────────────────────────────────────────────

export interface TemplateFieldConfig {
  key: string
  label: string
  type: TemplateFieldType
  placeholder?: string
  defaultRequired: boolean
  defaultValue?: string
  defaultValues?: Partial<Record<Language, string>>
  group?: string
}

// ─────────────────────────────────────────────
// LOCKED FIELDS — invisible to users
// Admin manages. Auto-applied at render time.
// Updating here propagates to ALL cloned templates on next render.
// ─────────────────────────────────────────────

export interface LockedFieldConfig {
  key: string
  label: string
  value: string
  note?: string
  // true = CIO system token (read-only even for admin, displayed as code chip)
  // false = static value admin can update (logo URLs, footer links, etc.)
  isReadOnly: boolean
}

// ─────────────────────────────────────────────
// LANGUAGES
// ─────────────────────────────────────────────

export type Language = 'en' | 'fr' | 'de' | 'it' | 'es'
export const LANGUAGES: Language[] = ['en', 'fr', 'de', 'it', 'es']

export const LANGUAGE_LABELS: Record<Language, string> = {
  en: 'English',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  es: 'Spanish',
}

// ─────────────────────────────────────────────
// FIELD VALUES (stored in SavedTemplate.fieldValues)
// ─────────────────────────────────────────────

// Values for a single language
export type TemplateFieldValues = Record<string, string>

// All languages combined
export type MultiLanguageFieldValues = Record<Language, TemplateFieldValues>

// ─────────────────────────────────────────────
// SECTION CONFIG (stored in SavedTemplate.sectionConfig)
// Same config applies to all languages
// ─────────────────────────────────────────────

export interface SavedSectionConfig {
  name: string       // e.g. "THUMBNAILS"
  label: string      // e.g. "Thumbnails"
  isActive: boolean
  isDeleted?: boolean // true = permanently removed from this saved template
}

// ─────────────────────────────────────────────
// TEMPLATE SECTION (parsed from HTML)
// ─────────────────────────────────────────────

export interface TemplateSection {
  name: string
  label: string
  isActive: boolean
  html: string
}

// ─────────────────────────────────────────────
// BRANDS
// ─────────────────────────────────────────────

export type BrandSlug = 'STAKES' | 'X7'

export const BRAND_LABELS: Record<BrandSlug, string> = {
  STAKES: 'Stakes',
  X7: 'X7 Casino',
}
