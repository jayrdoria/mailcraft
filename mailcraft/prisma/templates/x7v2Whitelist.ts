// X7 Casino V2 Whitelist master template config (2026-11-17).
// Identical to X7 Casino V2 (same brand, design, fields, presets) — only the links differ: every
// x7casino.com / x7casino2.com link becomes the bare WHITELIST_URL. Links can be changed later in
// Admin → Links without code. Master HTML: data/templates/master-templates/x7-v2-whitelist/{lang}.html
// (copy of the V2 files, whose links are all tokens).
// Shared by prisma/seed.ts (full reseed) and prisma/seed-x7v2-whitelist.ts (add-only, safe for prod).

import { withBannerTextFields } from './bannerText'
import { withV2LayoutFields } from './x7v2Layouts'
import { X7_V2_LANGUAGES, x7v2EditableFields, x7v2LockedFields } from './x7v2'

export const X7_V2_WL_SLUG = 'x7-casino-v2-whitelist-template'
export const WHITELIST_URL = 'https://x7casino.io'

const X7_URL = /https?:\/\/(?:www\.)?x7casino2?\.com[^\s"'<>]*/g

/** Deep copy with every X7 .com link replaced by the bare whitelist URL. */
export function toWhitelistLinks<T>(value: T): T {
  if (typeof value === 'string') return value.replace(X7_URL, WHITELIST_URL) as T
  if (Array.isArray(value)) return value.map(toWhitelistLinks) as T
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, toWhitelistLinks(v)])) as T
  }
  return value
}

export function x7v2WhitelistUpdateData(templateBaseDir: string) {
  return {
    baseFilePath: `${templateBaseDir}/master-templates/x7-v2-whitelist`,
    editableFields: toWhitelistLinks(withV2LayoutFields(withBannerTextFields(x7v2EditableFields, X7_V2_LANGUAGES))),
    lockedFields: toWhitelistLinks(x7v2LockedFields),
    languages: X7_V2_LANGUAGES,
  }
}

export function x7v2WhitelistCreateData(templateBaseDir: string) {
  return {
    name: 'X7 Casino V2 Whitelist',
    slug: X7_V2_WL_SLUG,
    brand: 'X7_V2' as const,
    description: 'X7 Casino V2 with whitelist links (x7casino.io) — 5 languages (EN, FR, DE, IT, ES)',
    isActive: true,
    ...x7v2WhitelistUpdateData(templateBaseDir),
  }
}
