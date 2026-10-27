import type { FieldValue, Language } from '@/lib/types/template'
import { presetText, type PresetKind, type ThumbnailPreset } from '@/lib/types/thumbnailPreset'

// ─────────────────────────────────────────────
// THUMBNAIL SLOTS — groups a template's THUMBn_* / ICONn_* fields into slots for
// the editor's slot cards, and turns a preset into per-language field values
// (shared by "Change" on one slot and "Fill from presets" on several).
// ─────────────────────────────────────────────

export const SLOT_FIELD_RE = /^(THUMB|ICON)(\d+)_(IMG|LINK|LABEL|SUBLABEL)$/

export interface ThumbSlot {
  prefix: string // THUMB1 / ICON2
  kind: PresetKind
  title: string // "Thumbnail 1" / "Icon 2"
  index: number
}

export function isSlotField(key: string): boolean {
  return SLOT_FIELD_RE.test(key)
}

// Slots that have an image field, in field order (THUMB before ICON, then by number)
export function slotsFromFields(fieldKeys: Iterable<string>): ThumbSlot[] {
  const seen = new Map<string, ThumbSlot>()
  for (const key of fieldKeys) {
    const m = SLOT_FIELD_RE.exec(key)
    if (!m || m[3] !== 'IMG') continue
    const prefix = `${m[1]}${m[2]}`
    if (seen.has(prefix)) continue
    const kind: PresetKind = m[1] === 'ICON' ? 'icon' : 'card'
    seen.set(prefix, { prefix, kind, title: `${kind === 'icon' ? 'Icon' : 'Thumbnail'} ${m[2]}`, index: Number(m[2]) })
  }
  return [...seen.values()].sort((a, b) => (a.kind === b.kind ? a.index - b.index : a.kind === 'card' ? -1 : 1))
}

// Per-language values a preset writes into one slot. Image = same everywhere; label,
// sublabel and link are translated (FRCA → FR). Empty optional texts keep the
// language's current value. Only fields the template actually has are written.
export function presetSlotValues(
  preset: ThumbnailPreset,
  prefix: string,
  languages: Language[],
  fieldKeys: Set<string>,
  current: Partial<Record<Language, Record<string, FieldValue>>>
): Partial<Record<Language, Record<string, FieldValue>>> {
  const out: Partial<Record<Language, Record<string, FieldValue>>> = {}
  const keep = (key: string, lang: Language) => {
    const v = current[lang]?.[key]
    return typeof v === 'string' ? v : ''
  }
  for (const lang of languages) {
    const values: Record<string, FieldValue> = {}
    if (fieldKeys.has(`${prefix}_IMG`)) values[`${prefix}_IMG`] = preset.imageUrl
    if (fieldKeys.has(`${prefix}_LABEL`)) values[`${prefix}_LABEL`] = presetText(preset.labels, lang)
    if (fieldKeys.has(`${prefix}_SUBLABEL`) && preset.sublabels) {
      values[`${prefix}_SUBLABEL`] = presetText(preset.sublabels, lang).trim() || keep(`${prefix}_SUBLABEL`, lang)
    }
    if (fieldKeys.has(`${prefix}_LINK`) && preset.links) {
      values[`${prefix}_LINK`] = presetText(preset.links, lang).trim() || keep(`${prefix}_LINK`, lang)
    }
    out[lang] = values
  }
  return out
}

// Merge several slot fills into one per-language patch (one store update)
export function mergeLangPatches(
  patches: Partial<Record<Language, Record<string, FieldValue>>>[]
): Partial<Record<Language, Record<string, FieldValue>>> {
  const out: Partial<Record<Language, Record<string, FieldValue>>> = {}
  for (const p of patches) {
    for (const [lang, values] of Object.entries(p) as [Language, Record<string, FieldValue>][]) {
      out[lang] = { ...(out[lang] ?? {}), ...values }
    }
  }
  return out
}

// Preset currently in a slot = same image + same label in every supported language
export function activePresetId(
  presets: ThumbnailPreset[],
  slot: ThumbSlot,
  languages: Language[],
  fieldKeys: Set<string>,
  values: Partial<Record<Language, Record<string, FieldValue>>>
): string {
  return (
    presets.find(
      (p) =>
        p.kind === slot.kind &&
        languages.every((lang) => values[lang]?.[`${slot.prefix}_IMG`] === p.imageUrl) &&
        (!fieldKeys.has(`${slot.prefix}_LABEL`) ||
          languages.every((lang) => values[lang]?.[`${slot.prefix}_LABEL`] === presetText(p.labels, lang)))
    )?.id ?? ''
  )
}
