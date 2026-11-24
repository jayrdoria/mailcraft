// X7 Casino V2 Whitelist master template config (2026-11-17).
// Identical to X7 Casino V2 (same brand, design, fields, presets) except the links — every
// x7casino.com / x7casino2.com link becomes the bare WHITELIST_URL — and, since 2026-11-24, the footer:
// own license text (Boni Tech), payment logos kept, 18+ / RG links → x7casino.io/{lang}/responsible-gaming.
// Links can be changed later in Admin → Links without code. Master HTML: data/templates/master-templates/x7-v2-whitelist/{lang}.html
// (copy of the V2 files, whose links are all tokens).
// Shared by prisma/seed.ts (full reseed) and prisma/seed-x7v2-whitelist.ts (add-only, safe for prod).

import { withBannerTextFields } from './bannerText'
import { withV2LayoutFields } from './x7v2Layouts'
import { X7V2_GAMCARE_LINK, X7V2_WL_LOGO2_LINK, x7WhitelistRgUrl } from './lockedLinks'
import { X7_V2_LANGUAGES, x7v2EditableFields } from './x7v2'

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

// Footer (2026-11-24): Whitelist license (Boni Tech / Tobique). X7 V2 has no license field — added here, before FOOTER_LEGAL.
// Gmail turns the registered address into a blue Google Maps link. Text already inside a link is left alone
// (device-tested 2026-11-24: zero-width characters and hidden spans did NOT stop it). No href = not clickable.
// Caveat: the editor (TipTap) drops href-less links, so editing this field by hand removes the wrapper.
const noAutoLink = (text: string) => `<a style="color: #888888 !important; text-decoration: none !important;">${text}</a>`

export const WL_LICENSE: Record<string, string> = {
  en: 'This website is licensed under Boni Tech Limited, a company incorporated under the laws of Saint Lucia with registration number 2023-00614 and registered address at ADCO Incorporated, ' + noAutoLink('10 Manoel Street, Castries, Saint Lucia') + '. Boni Tech Limited is licensed and regulated in Tobique First Nation by the Tobique Gaming Commission, with license number 0000018 issued on 16/08/2024.',
  fr: 'Ce site web est exploité sous licence par Boni Tech Limited, une société constituée conformément aux lois de Sainte-Lucie, immatriculée sous le numéro 2023-00614, dont le siège social est situé à ADCO Incorporated, ' + noAutoLink('10 Manoel Street, Castries, Sainte-Lucie') + '. Boni Tech Limited est titulaire d’une licence et réglementée au sein de la Première Nation de Tobique par la Tobique Gaming Commission, sous le numéro de licence 0000018, délivrée le 16/08/2024.',
  de: 'Diese Website wird unter der Lizenz von Boni Tech Limited betrieben, einem nach den Gesetzen von St. Lucia gegründeten Unternehmen mit der Registrierungsnummer 2023-00614 und dem eingetragenen Geschäftssitz ADCO Incorporated, ' + noAutoLink('10 Manoel Street, Castries, St. Lucia') + '. Boni Tech Limited ist in der Tobique First Nation durch die Tobique Gaming Commission unter der Lizenznummer 0000018, ausgestellt am 16.08.2024, lizenziert und reguliert.',
  it: 'Questo sito web opera su licenza di Boni Tech Limited, una società costituita secondo le leggi di Santa Lucia, con numero di registrazione 2023-00614 e sede legale presso ADCO Incorporated, ' + noAutoLink('10 Manoel Street, Castries, Santa Lucia') + '. Boni Tech Limited è autorizzata e regolamentata nella Prima Nazione di Tobique dalla Tobique Gaming Commission, con numero di licenza 0000018, rilasciata il 16/08/2024.',
  es: 'Este sitio web opera bajo la licencia de Boni Tech Limited, una empresa constituida conforme a las leyes de Santa Lucía, con número de registro 2023-00614 y domicilio social en ADCO Incorporated, ' + noAutoLink('10 Manoel Street, Castries, Santa Lucía') + '. Boni Tech Limited cuenta con licencia y está regulada en la Primera Nación de Tobique por la Tobique Gaming Commission, bajo el número de licencia 0000018, emitida el 16/08/2024.',
}
export const WL_LICENSE_FIELD = {
  key: 'FOOTER_LICENSE', label: 'License Text', type: 'richtext' as const, group: 'Legal',
  defaultValues: WL_LICENSE,
}

// Footer (2026-11-24): the 18+ logo and the Responsible Gambling link go to the per-language RG page
export const x7v2WhitelistLockedFields = [X7V2_WL_LOGO2_LINK, X7V2_GAMCARE_LINK]

function withWhitelistFooter<T extends { key: string; defaultValues?: Record<string, string | undefined> }>(fields: T[]): T[] {
  const legalAt = fields.findIndex((f) => f.key === 'FOOTER_LEGAL')
  if (legalAt === -1) throw new Error('x7v2 whitelist: FOOTER_LEGAL field missing')
  const withLicense = [...fields.slice(0, legalAt), WL_LICENSE_FIELD as unknown as T, ...fields.slice(legalAt)]
  return withLicense.map((f) =>
    f.key === 'FOOTER_LEGAL' && f.defaultValues
      ? {
          ...f,
          defaultValues: Object.fromEntries(
            Object.entries(f.defaultValues).map(([lang, v]) => [lang, v?.replaceAll(`href="${WHITELIST_URL}"`, `href="${x7WhitelistRgUrl(lang)}"`)])
          ),
        }
      : f
  )
}

export function x7v2WhitelistUpdateData(templateBaseDir: string) {
  return {
    baseFilePath: `${templateBaseDir}/master-templates/x7-v2-whitelist`,
    editableFields: withWhitelistFooter(toWhitelistLinks(withV2LayoutFields(withBannerTextFields(x7v2EditableFields, X7_V2_LANGUAGES)))),
    lockedFields: x7v2WhitelistLockedFields,
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
