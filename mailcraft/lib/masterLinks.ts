import type {
  Language,
  LockedFieldConfig,
  MultiLanguageFieldValues,
  TemplateFieldConfig,
} from '@/lib/types/template'

// ─────────────────────────────────────────────
// Master links over time (Admin → Links, 2026-11-17)
//
//  master.lockedFields         baseline — templates created before snapshots existed keep using it
//  master.currentLockedFields  what Admin → Links set (NULL = baseline); copied into NEW templates
//  saved.lockedFieldsSnapshot  the links a template was created / duplicated with (NULL = baseline)
//  master.linkHistory          previous editable defaults, so a duplicate can swap stale defaults (D7)
// ─────────────────────────────────────────────

/** { [fieldKey]: { [lang | '*']: previous default values } } — '*' = single (all-language) default */
export type LinkHistory = Record<string, Partial<Record<Language | '*', string[]>>>

interface MasterLinksLike {
  lockedFields: unknown
  currentLockedFields?: unknown
}

/** Locked links a NEW template gets (and the master preview shows). */
export function currentLockedFields(master: MasterLinksLike): LockedFieldConfig[] {
  return ((master.currentLockedFields ?? master.lockedFields) as LockedFieldConfig[] | null) ?? []
}

/** Locked links an existing saved template renders with — its own snapshot, else the baseline. */
export function effectiveLockedFields(
  saved: { lockedFieldsSnapshot?: unknown },
  master: MasterLinksLike
): LockedFieldConfig[] {
  return ((saved.lockedFieldsSnapshot ?? master.lockedFields) as LockedFieldConfig[] | null) ?? []
}

/** Current default of an editable field for one language. */
export function fieldDefault(field: TemplateFieldConfig, lang: Language): string | undefined {
  return field.defaultValues?.[lang] ?? field.defaultValue
}

/**
 * D7 — on duplicate: any field value that still equals a PREVIOUS default (replaced through
 * Admin → Links) becomes the current default. Values the user typed themselves are kept.
 * Returns the same object when nothing changed.
 */
export function refreshStaleDefaults(
  fieldValues: MultiLanguageFieldValues,
  editableFields: TemplateFieldConfig[],
  history: LinkHistory | null | undefined
): MultiLanguageFieldValues {
  if (!history || Object.keys(history).length === 0) return fieldValues
  const byKey = new Map(editableFields.map((f) => [f.key, f]))
  let next: MultiLanguageFieldValues | null = null

  for (const [lang, values] of Object.entries(fieldValues) as [Language, Record<string, unknown>][]) {
    if (!values || typeof values !== 'object') continue
    for (const [key, value] of Object.entries(values)) {
      const field = byKey.get(key)
      const past = history[key]
      if (!field || !past || typeof value !== 'string') continue
      const current = fieldDefault(field, lang)
      if (current === undefined || value === current) continue
      const stale = [...(past[lang] ?? []), ...(past['*'] ?? [])]
      if (!stale.includes(value)) continue
      next ??= structuredClone(fieldValues)
      next[lang]![key] = current
    }
  }
  return next ?? fieldValues
}
