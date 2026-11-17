import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { currentLockedFields, type LinkHistory } from '@/lib/masterLinks'
import { invalidateMasterTemplateListCache } from '@/lib/services/templateService'
import { LANGUAGES } from '@/lib/types/template'
import type { Language, LockedFieldConfig, TemplateFieldConfig } from '@/lib/types/template'

// ─────────────────────────────────────────────
// Admin → Links (2026-11-17)
// Every link of a master as an editable "slot", one per language:
//   editable url/link fields (images excluded)  → default value
//   editable richtext fields                    → each href="…" inside the default (index = nth href)
//   locked fields (not CIO read-only tokens)    → resolved per-language value
// Edits only change the master's defaults + currentLockedFields, so they reach NEW templates and
// duplicates; existing templates keep their own values / locked snapshot.
// ─────────────────────────────────────────────

export interface LinkSlot {
  /** Stable id: `${source}:${key}:${lang}:${index}` */
  id: string
  source: 'editable' | 'locked'
  key: string
  label: string
  group: string
  lang: Language
  index: number
  url: string
}

export interface LinkEdit {
  id: string
  /** The URL the admin saw — must still match (else STALE) */
  from: string
  to: string
}

export class LinkEditError extends Error {
  constructor(
    message: string,
    readonly code: 'STALE' | 'INVALID' | 'NOT_FOUND'
  ) {
    super(message)
  }
}

// Locked values are injected into the HTML unescaped, so new links must be plain URLs or CIO tokens:
// no quotes / angle brackets / whitespace (except inside {% %}), and only safe schemes.
const SAFE_LINK =
  /^(?:https?:\/\/[^\s"'<>`\\]+|mailto:[^\s"'<>`\\]+|tel:[^\s"'<>`\\]+|#[^\s"'<>`\\]*|\{\{\s*[\w.|]+\s*\}\}|\{%[^"'<>`\\%]+%\})$/
export const MAX_LINK_LENGTH = 2000

export function isSafeLink(url: string): boolean {
  return url.length > 0 && url.length <= MAX_LINK_LENGTH && SAFE_LINK.test(url)
}

const isImageField = (key: string) => /_(IMG|IMAGE)$/.test(key)
const isUrlField = (f: TemplateFieldConfig) => (f.type === 'url' || f.type === 'link') && !isImageField(f.key)
const HREF = /href="([^"]*)"/g

interface MasterLike {
  editableFields: unknown
  lockedFields: unknown
  currentLockedFields?: unknown
  languages: unknown
  linkHistory?: unknown
}

function masterLanguages(master: MasterLike): Language[] {
  const langs = (master.languages as Language[] | null) ?? []
  return langs.length > 0 ? langs : LANGUAGES
}

const stringDefault = (f: TemplateFieldConfig, lang: Language) => f.defaultValues?.[lang] ?? f.defaultValue
const lockedFor = (f: LockedFieldConfig, lang: Language) => f.values?.[lang] ?? f.value
const slotId = (source: LinkSlot['source'], key: string, lang: Language, index: number) =>
  `${source}:${key}:${lang}:${index}`

/** Walks every link slot; `map` returns the new URL (or the same one). Pure — returns new configs. */
function mapLinks(master: MasterLike, map: (slot: LinkSlot) => string) {
  const langs = masterLanguages(master)
  const fields = (master.editableFields as TemplateFieldConfig[] | null) ?? []
  const locked = currentLockedFields(master)
  const history: LinkHistory = structuredClone((master.linkHistory as LinkHistory | null) ?? {})
  const slots: LinkSlot[] = []
  let changed = 0
  let lockedChanged = false

  const nextFields = fields.map((f) => {
    const isRich = f.type === 'richtext'
    if (!isUrlField(f) && !isRich) return f
    const group = f.group ?? 'Fields'
    const perLang: Partial<Record<Language, string>> = {}
    let fieldChanged = false
    for (const lang of langs) {
      const before = stringDefault(f, lang)
      if (before === undefined) continue
      let after: string
      if (isRich) {
        let index = 0
        after = before.replace(HREF, (_m, url: string) => {
          const slot: LinkSlot = { id: slotId('editable', f.key, lang, index), source: 'editable', key: f.key, label: f.label, group, lang, index, url }
          index++
          slots.push(slot)
          return `href="${map(slot)}"`
        })
      } else {
        if (before === '') continue
        const slot: LinkSlot = { id: slotId('editable', f.key, lang, 0), source: 'editable', key: f.key, label: f.label, group, lang, index: 0, url: before }
        slots.push(slot)
        after = map(slot)
      }
      perLang[lang] = after
      if (after !== before) {
        fieldChanged = true
        changed++
        const past = ((history[f.key] ??= {})[lang] ??= [])
        if (!past.includes(before)) past.push(before)
      }
    }
    if (!fieldChanged) return f
    // A single (all-language) default that is still the same everywhere stays single
    const values = Object.values(perLang)
    if (!f.defaultValues && values.every((v) => v === values[0])) return { ...f, defaultValue: values[0] }
    return { ...f, defaultValues: { ...f.defaultValues, ...perLang } }
  })

  const nextLocked = locked.map((f) => {
    if (f.isReadOnly) return f
    const perLang: Partial<Record<Language, string>> = {}
    let fieldChanged = false
    for (const lang of langs) {
      const before = lockedFor(f, lang)
      const slot: LinkSlot = { id: slotId('locked', f.key, lang, 0), source: 'locked', key: f.key, label: f.label, group: 'Footer (locked)', lang, index: 0, url: before }
      slots.push(slot)
      const after = map(slot)
      perLang[lang] = after
      if (after !== before) {
        fieldChanged = true
        lockedChanged = true
        changed++
      }
    }
    if (!fieldChanged) return f
    // Same link in every language → plain value; otherwise value stays the fallback + per-language overrides
    const values = Object.values(perLang)
    if (values.every((v) => v === values[0])) {
      const { values: _drop, ...rest } = f
      void _drop
      return { ...rest, value: values[0] }
    }
    const overrides: Partial<Record<Language, string>> = {}
    for (const [lang, url] of Object.entries(perLang) as [Language, string][]) if (url !== f.value) overrides[lang] = url
    return { ...f, values: overrides }
  })

  return { slots, changed, lockedChanged, editableFields: nextFields, lockedFields: nextLocked, linkHistory: history }
}

export function listLinkSlots(master: MasterLike): LinkSlot[] {
  return mapLinks(master, (s) => s.url).slots
}

/** Applies single edits and/or one bulk find → replace. Throws LinkEditError on stale / invalid input. */
export function applyLinkEdits(master: MasterLike, edits: LinkEdit[], bulk?: { find: string; replace: string }) {
  const byId = new Map(edits.map((e) => [e.id, e]))
  const seen = new Set<string>()
  const invalid: string[] = []

  const result = mapLinks(master, (slot) => {
    let url = slot.url
    const edit = byId.get(slot.id)
    if (edit) {
      seen.add(slot.id)
      if (edit.from !== slot.url) throw new LinkEditError(`"${slot.label}" (${slot.lang.toUpperCase()}) was changed by someone else — reload`, 'STALE')
      url = edit.to.trim()
    }
    if (bulk && bulk.find && url.includes(bulk.find)) url = url.split(bulk.find).join(bulk.replace)
    if (url !== slot.url && !isSafeLink(url)) invalid.push(`${slot.label} (${slot.lang.toUpperCase()}): ${url.slice(0, 120)}`)
    return url
  })

  const missing = edits.filter((e) => !seen.has(e.id))
  if (missing.length) throw new LinkEditError('Some links no longer exist on this master — reload', 'NOT_FOUND')
  if (invalid.length) {
    throw new LinkEditError(`Not a valid link (use https://…, mailto:, tel:, # or a CIO token): ${invalid.slice(0, 3).join(' · ')}`, 'INVALID')
  }
  return result
}

/** Loads, applies and saves (optimistic: `expectedUpdatedAt` must match). Returns null when nothing changed. */
export async function updateMasterLinks(params: {
  masterId: string
  expectedUpdatedAt: string
  edits: LinkEdit[]
  bulk?: { find: string; replace: string }
}) {
  const master = await prisma.masterTemplate.findUnique({ where: { id: params.masterId } })
  if (!master) throw new LinkEditError('Master template not found', 'NOT_FOUND')
  if (master.updatedAt.toISOString() !== new Date(params.expectedUpdatedAt).toISOString()) {
    throw new LinkEditError('This master was changed by someone else — reload to see the latest links', 'STALE')
  }

  const next = applyLinkEdits(master, params.edits, params.bulk)
  if (next.changed === 0) return { master, changed: 0 }

  const res = await prisma.masterTemplate.updateMany({
    where: { id: master.id, updatedAt: master.updatedAt },
    data: {
      editableFields: next.editableFields as unknown as Prisma.InputJsonValue,
      // Only once a locked link is actually edited — until then NULL keeps following the baseline
      ...(next.lockedChanged ? { currentLockedFields: next.lockedFields as unknown as Prisma.InputJsonValue } : {}),
      linkHistory: next.linkHistory as unknown as Prisma.InputJsonValue,
    },
  })
  if (res.count === 0) throw new LinkEditError('This master was changed by someone else — reload to see the latest links', 'STALE')

  await invalidateMasterTemplateListCache()
  const updated = await prisma.masterTemplate.findUniqueOrThrow({ where: { id: master.id } })
  return { master: updated, changed: next.changed }
}
