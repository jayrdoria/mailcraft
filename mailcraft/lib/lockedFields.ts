import type { Language, LockedFieldConfig } from '@/lib/types/template'

// ─────────────────────────────────────────────
// Locked field resolution
// A locked field has one `value` for every language, optionally overridden per language
// via `values` (e.g. Stakes FR/IT 18+ link → stakes3.com). Shared by every render path
// so exports, previews and the editor always agree.
// ─────────────────────────────────────────────

export function lockedValue(field: LockedFieldConfig, lang: Language): string {
  return field.values?.[lang] ?? field.value
}

export function lockedTokensFor(fields: LockedFieldConfig[], lang: Language): Record<string, string> {
  const tokens: Record<string, string> = {}
  for (const field of fields) tokens[field.key] = lockedValue(field, lang)
  return tokens
}

export function injectLockedFields(html: string, fields: LockedFieldConfig[], lang: Language): string {
  let result = html
  for (const field of fields) {
    const escaped = field.key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    result = result.replace(new RegExp(`\\{\\{${escaped}\\}\\}`, 'g'), lockedValue(field, lang))
  }
  return result
}
