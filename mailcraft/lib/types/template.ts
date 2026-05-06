// ─────────────────────────────────────────────
// BODY PARAGRAPHS
// ─────────────────────────────────────────────

export interface BodyParagraph {
  id: string
  html: string // may contain <strong> tags for bold
}

// ─────────────────────────────────────────────
// FIELD TYPES
// ─────────────────────────────────────────────

export type TemplateFieldType = 'url' | 'text' | 'richtext' | 'link' | 'paragraphs'

// Value stored per field — string for all types except 'paragraphs'
export type FieldValue = string | BodyParagraph[]

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
  // Per-language overrides for string fields (url, text, richtext, link)
  defaultValues?: Partial<Record<Language, string>>
  // Initial paragraphs for 'paragraphs' type fields (used when no per-language override exists)
  defaultParagraphs?: BodyParagraph[]
  // Per-language overrides for paragraph fields
  defaultParagraphsByLang?: Partial<Record<Language, BodyParagraph[]>>
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

export type Language = 'en' | 'fr' | 'frca' | 'de' | 'it' | 'es'
export const LANGUAGES: Language[] = ['en', 'fr', 'frca', 'de', 'it', 'es']

export const LANGUAGE_LABELS: Record<Language, string> = {
  en:   'EN',
  fr:   'FR',
  frca: 'FRCA',
  de:   'DE',
  it:   'IT',
  es:   'ES',
}

// ─────────────────────────────────────────────
// FIELD VALUES (stored in SavedTemplate.fieldValues)
// ─────────────────────────────────────────────

// Values for a single language
export type TemplateFieldValues = Record<string, FieldValue>

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

export type BrandSlug = 'STAKES' | 'STAKES_CASINO' | 'X7'

export const BRAND_LABELS: Record<BrandSlug, string> = {
  STAKES:        'Stakes',
  STAKES_CASINO: 'Stakes Casino',
  X7:            'X7 Casino',
}
