import { z } from 'zod'
import type { FieldValue } from '@/lib/types/template'

// ─────────────────────────────────────────────
// X7 CASINO V2 LAYOUT OPTIONS — selectable body designs, thumbnail designs and an
// optional "More at X7" heading. Pure string work, shared by the server render,
// clientRender and the editor canvas (same pattern as lib/bannerText.ts).
//
// Masters opt in with adjacent region markers (stripping them is byte-exact):
//   <!-- V2BODY:START --> … <!-- V2BODY:END -->      the Classic body row
//   <!-- V2THUMBS:START --> … <!-- V2THUMBS:END -->  the Classic promo-card row
// Defaults (Classic body, cards, no heading) → markers stripped only, so existing
// templates render byte-identical. Other choices replace a region with generated
// markup that emits {{TOKENS}}, so the normal injection pass escapes/sanitizes them.
//
// Email-safe without @media (Gmail/CIO): inline-block wraps, % columns, fixed px
// fonts that fit 320px. The @media block added in <head> is an optional extra only.
// Markup mirrors the approved POCs: Approved Emails/X7 Casino V2/poc/x7v2-body-*.html
// ─────────────────────────────────────────────

export const V2_BODY_START = '<!-- V2BODY:START -->'
export const V2_BODY_END = '<!-- V2BODY:END -->'
export const V2_THUMBS_START = '<!-- V2THUMBS:START -->'
export const V2_THUMBS_END = '<!-- V2THUMBS:END -->'
const BODY_REGION_RE = /<!-- V2BODY:START -->[\s\S]*?<!-- V2BODY:END -->/g
const THUMBS_REGION_RE = /<!-- V2THUMBS:START -->[\s\S]*?<!-- V2THUMBS:END -->/g

// Settings live as meta-keys on fieldValues.en (same pattern as _bodyAlignment)
export const LAYOUT_META_KEYS = {
  body: '_bodyLayout',
  align: '_bodyTextAlign',
  thumbs: '_thumbStyle',
  heading: '_moreHeading',
  games: '_gameCount',
} as const

export const BODY_LAYOUTS = ['classic', 'welcome', 'spins'] as const
export const THUMB_STYLES = ['cards', 'icons'] as const
export const BODY_TEXT_ALIGNS = ['left', 'center'] as const
export const GAME_COUNTS = [1, 2, 3] as const
export type GameCount = (typeof GAME_COUNTS)[number]
export type BodyLayout = (typeof BODY_LAYOUTS)[number]
export type ThumbStyle = (typeof THUMB_STYLES)[number]
export type BodyTextAlign = (typeof BODY_TEXT_ALIGNS)[number]

export interface LayoutSettings {
  body: BodyLayout
  align: BodyTextAlign
  thumbs: ThumbStyle
  heading: boolean
  games: GameCount // Free Spins: how many game chips to show (texts of hidden ones are kept)
}

const bodySchema = z.enum(BODY_LAYOUTS).catch('classic')
const thumbsSchema = z.enum(THUMB_STYLES).catch('cards')
const alignSchema = z.enum(BODY_TEXT_ALIGNS).catch('left')

export function parseLayoutSettings(enValues: Record<string, FieldValue> | undefined): LayoutSettings {
  const v = enValues ?? {}
  return {
    body: bodySchema.parse(v[LAYOUT_META_KEYS.body]),
    align: alignSchema.parse(v[LAYOUT_META_KEYS.align]),
    thumbs: thumbsSchema.parse(v[LAYOUT_META_KEYS.thumbs]),
    heading: v[LAYOUT_META_KEYS.heading] === 'on',
    games: v[LAYOUT_META_KEYS.games] === '1' ? 1 : v[LAYOUT_META_KEYS.games] === '2' ? 2 : 3,
  }
}

export function hasBodyLayoutMarkers(html: string): boolean {
  return html.includes(V2_BODY_START) && html.includes(V2_BODY_END)
}

export function hasThumbLayoutMarkers(html: string): boolean {
  return html.includes(V2_THUMBS_START) && html.includes(V2_THUMBS_END)
}

// ─────────────────────────────────────────────
// Field keys per option — drives which fields the editor shows
// ─────────────────────────────────────────────

export const WELCOME_FIELD_KEYS = [
  'WB_GREETING', 'WB_STAT_VALUE', 'WB_STAT_TEXT', 'WB_STEPS_LABEL', 'WB_STEP1', 'WB_STEP2', 'WB_STEP3',
] as const
export const SPINS_FIELD_KEYS = ['FS_TITLE', 'FS_SUBLINE', 'GAME1', 'GAME2', 'GAME3', 'FS_VALIDITY'] as const
export const GAME_FIELD_KEYS = ['GAME1', 'GAME2', 'GAME3'] as const
export const ICON_SLOTS = [1, 2, 3] as const
export const ICON_FIELD_KEYS = ICON_SLOTS.flatMap((n) => [`ICON${n}_IMG`, `ICON${n}_LINK`, `ICON${n}_LABEL`])
export const MORE_HEADING_KEY = 'MORE_HEADING'

const BODY_ONLY: Record<string, BodyLayout[]> = {
  GREETING: ['classic', 'spins'],
  BODY_CONTENT: ['classic'],
  ...Object.fromEntries(WELCOME_FIELD_KEYS.map((k) => [k, ['welcome']])),
  ...Object.fromEntries(SPINS_FIELD_KEYS.map((k) => [k, ['spins']])),
}

// Is this field irrelevant for the chosen options? (only for masters that opted in)
export function isLayoutFieldHidden(
  key: string,
  s: LayoutSettings,
  opts: { body: boolean; thumbs: boolean }
): boolean {
  if (opts.body && BODY_ONLY[key] && !BODY_ONLY[key].includes(s.body)) return true
  if (opts.body && GAME_FIELD_KEYS.indexOf(key as (typeof GAME_FIELD_KEYS)[number]) >= s.games) return true
  if (opts.thumbs) {
    if (key === MORE_HEADING_KEY) return !s.heading
    if (s.thumbs === 'icons' && /^THUMB\d+_/.test(key)) return true
    if (s.thumbs === 'cards' && ICON_FIELD_KEYS.includes(key)) return true
  }
  return false
}

// Fields a choice needs — the editor backfills missing ones from field defaults
// (templates saved before these fields existed have no values for them).
export function layoutFieldKeys(s: LayoutSettings): string[] {
  const keys: string[] = []
  if (s.body === 'welcome') keys.push(...WELCOME_FIELD_KEYS, 'CTA_TEXT', 'CTA_LINK')
  if (s.body === 'spins') keys.push('GREETING', ...SPINS_FIELD_KEYS, 'CTA_TEXT', 'CTA_LINK')
  if (s.thumbs === 'icons') keys.push(...ICON_FIELD_KEYS)
  if (s.heading) keys.push(MORE_HEADING_KEY)
  return keys
}

// ─────────────────────────────────────────────
// Markup helpers
// ─────────────────────────────────────────────

const FB = "'Bebas Neue', Impact, 'Arial Narrow', sans-serif"
const FM = "'Manrope', 'Helvetica Neue', Helvetica, Arial, sans-serif"
const RED = '#c80824'
const LINE = '#26282e'
const FIRST_NAME = '{{customer.First_Name | capitalize}}'
const BREAK = 'word-break: break-word; overflow-wrap: break-word;'

function hasText(value: FieldValue | undefined): boolean {
  return typeof value === 'string' && value.trim() !== ''
}

const tok = (key: string) => `{{${key}}}`

// CTA shared by both new bodies — centred; full width on phones via the optional @media
function ctaButton(font: 'bebas' | 'manrope'): string {
  const text = font === 'bebas'
    ? `font-family: ${FB}; font-size: 20px; font-weight: 400; letter-spacing: 2.5px; line-height: 21px; padding: 14px 32px;`
    : `font-family: ${FM}; font-size: 18px; font-weight: 700; letter-spacing: 2.5px; line-height: 20px; padding: 15px 24px; min-width: 184px;`
  return (
    `<table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" class="bv-cta" style="border-radius: 4px"><tr>` +
    `<td align="center" bgcolor="${RED}" style="background-color: ${RED}; border-radius: 4px; box-shadow: 0 0 22px rgba(200, 8, 36, 0.55);">` +
    `<a href="{{CTA_LINK}}" class="cta-btn bv-cta-a" style="display: inline-block; background-color: ${RED}; color: #ffffff; ${text} text-align: center; text-transform: uppercase; text-decoration: none; border-radius: 4px;">{{CTA_TEXT}}</a>` +
    `</td></tr></table>`
  )
}

function bodyRow(inner: string, comment: string, top: number): string {
  return (
    `<!-- ${comment} -->\n` +
    `<tr>\n<td align="left" class="bv-td" style="padding: ${top}px 36px 18px 36px; background-color: #000000;">\n` +
    inner +
    `\n</td>\n</tr>`
  )
}

// ── Welcome Boost (v1): headline · stat · how it works · CTA ──
function buildWelcome(v: Record<string, FieldValue>, align: BodyTextAlign): string {
  const parts: string[] = []
  const greeting = hasText(v.WB_GREETING) ? `${tok('WB_GREETING')} ` : ''
  parts.push(
    `<p style="margin: 0; padding-bottom: 22px; font-family: ${FB}; font-size: 28px; font-weight: 400; color: #ffffff; text-align: ${align}; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.2; ${BREAK}">${greeting}${FIRST_NAME}!</p>`
  )

  const statValue = hasText(v.WB_STAT_VALUE)
  const statText = hasText(v.WB_STAT_TEXT)
  if (statValue || statText) {
    // Side by side on desktop, stacks on phones (inline-block wrap). Centred = the
    // bar + text shrink-wrap and sit in the middle.
    const tableAttrs = align === 'center' ? 'align="center"' : 'width="100%" style="width: 100%"'
    const value = statValue
      ? `<!--[if mso]><table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr><td valign="bottom" style="padding-right: 18px;"><![endif]-->` +
        `<div style="display: inline-block; vertical-align: baseline; margin-right: 18px; font-family: ${FB}; font-size: 46px; font-weight: 400; line-height: 46px; color: #ffffff;">${tok('WB_STAT_VALUE')}</div>` +
        `<!--[if mso]></td><td valign="bottom" style="padding-bottom: 8px;"><![endif]-->`
      : `<!--[if mso]><table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr><td><![endif]-->`
    const text = statText
      ? `<div style="display: inline-block; vertical-align: baseline; font-family: ${FM}; font-size: 15px; font-weight: 400; line-height: 22px; color: #a3a3a3;">${tok('WB_STAT_TEXT')}</div>`
      : ''
    parts.push(
      `<table role="presentation" border="0" cellpadding="0" cellspacing="0" ${tableAttrs}><tr>` +
      `<td align="left" style="padding: 2px 0 2px 19px; border-left: 3px solid ${RED}; font-size: 0; line-height: 0; text-align: left;">` +
      value + text + `<!--[if mso]></td></tr></table><![endif]-->` +
      `</td></tr></table>`
    )
  }

  if (hasText(v.WB_STEPS_LABEL)) {
    parts.push(
      `<p style="margin: 0; padding: 32px 0 12px 0; font-family: ${FB}; font-size: 13px; font-weight: 400; color: #8a8a8a; text-align: ${align}; text-transform: uppercase; letter-spacing: 2px; line-height: 1.2;">${tok('WB_STEPS_LABEL')}</p>`
    )
  }

  const steps = (['WB_STEP1', 'WB_STEP2', 'WB_STEP3'] as const).filter((k) => hasText(v[k]))
  if (steps.length > 0) {
    const rows = steps.map((key, i) => {
      const num = String(i + 1).padStart(2, '0')
      const border = `border-top: 1px solid ${LINE};${i === steps.length - 1 ? ` border-bottom: 1px solid ${LINE};` : ''}`
      if (align === 'center') {
        return (
          `<tr><td align="center" style="padding: 14px 0; ${border} font-family: ${FM}; font-size: 15px; font-weight: 700; line-height: 1.4; color: #ffffff; text-align: center; ${BREAK}">` +
          `<span style="font-family: ${FB}; font-size: 24px; font-weight: 400; line-height: 24px; color: ${RED}; vertical-align: -2px;">${num}</span>&nbsp;&nbsp;&nbsp;${tok(key)}</td></tr>`
        )
      }
      return (
        `<tr><td width="44" valign="middle" style="width: 44px; padding: 14px 0; ${border} font-family: ${FB}; font-size: 24px; font-weight: 400; line-height: 24px; color: ${RED};">${num}</td>` +
        `<td valign="middle" style="padding: 14px 0; ${border} font-family: ${FM}; font-size: 15px; font-weight: 700; line-height: 1.4; color: #ffffff; ${BREAK}">${tok(key)}</td></tr>`
      )
    })
    const top = hasText(v.WB_STEPS_LABEL) ? '' : `<div style="height: 28px; line-height: 28px; font-size: 0">&nbsp;</div>`
    parts.push(
      top +
      `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="width: 100%">${rows.join('')}</table>`
    )
  }

  parts.push(`<div style="height: 28px; line-height: 28px; font-size: 0">&nbsp;</div>`)
  parts.push(ctaButton('bebas'))
  return bodyRow(parts.join('\n'), 'BODY — Welcome Boost', 36)
}

// ── Free Spins (v4): hello · title · subline · game chips · validity · CTA ──
function chip(key: string): string {
  return (
    `<div style="display: inline-block; margin: 0 4px 8px 4px; padding: 6px 14px 6px 12px; background-color: #141518; border: 1px solid #2e3038; border-radius: 999px; font-family: ${FM}; font-size: 13px; font-weight: 700; line-height: 16px; color: #ffffff; white-space: nowrap;">` +
    `<span style="color: ${RED}; font-size: 11px; line-height: 16px;">&#9679;</span>&nbsp;&nbsp;${tok(key)}</div>`
  )
}

function buildSpins(v: Record<string, FieldValue>, align: BodyTextAlign, gameCount: GameCount): string {
  const parts: string[] = []
  if (hasText(v.GREETING)) {
    parts.push(
      `<p style="margin: 0; padding-bottom: 2px; font-family: ${FM}; font-size: 16px; font-weight: 400; color: #b3b3b3; text-align: ${align}; line-height: 1.4; ${BREAK}">${tok('GREETING')}, ${FIRST_NAME}!</p>`
    )
  }
  if (hasText(v.FS_TITLE)) {
    parts.push(
      `<p style="margin: 0; padding-bottom: 4px; font-family: ${FM}; font-size: 40px; font-weight: 700; color: #ffffff; text-align: ${align}; text-transform: uppercase; letter-spacing: -0.5px; line-height: 1.15; text-shadow: 0 0 24px rgba(255, 255, 255, 0.22); ${BREAK}">${tok('FS_TITLE')}</p>`
    )
  }
  if (hasText(v.FS_SUBLINE)) {
    parts.push(
      `<p style="margin: 0; padding-bottom: 22px; font-family: ${FM}; font-size: 15px; font-weight: 400; color: #a3a3a3; text-align: ${align}; line-height: 1.5;">${tok('FS_SUBLINE')}</p>`
    )
  } else {
    parts.push(`<div style="height: 22px; line-height: 22px; font-size: 0">&nbsp;</div>`)
  }

  // 1–3 chips (game count), centred; empty games are dropped too so the row re-centres
  const games = GAME_FIELD_KEYS.slice(0, gameCount).filter((k) => hasText(v[k]))
  if (games.length > 0) {
    parts.push(
      `<div style="font-size: 0; line-height: 0; text-align: center;">` +
      `<!--[if mso]><table role="presentation" align="center" border="0" cellpadding="0" cellspacing="0"><tr><td style="padding: 0 4px;"><![endif]-->` +
      games.map(chip).join(`<!--[if mso]></td><td style="padding: 0 4px;"><![endif]-->`) +
      `<!--[if mso]></td></tr></table><![endif]-->` +
      `</div>`
    )
  }

  if (hasText(v.FS_VALIDITY)) {
    parts.push(
      `<p style="margin: 0; padding: 8px 0 24px 0; font-family: ${FM}; font-size: 13px; font-weight: 400; color: #9a9a9a; text-align: center; line-height: 1.5;">` +
      `<span style="display: inline-block; width: 9px; height: 7px; border: 2px solid ${RED}; border-top-width: 4px; border-radius: 2px; vertical-align: -1px;"></span>&nbsp;&nbsp;${tok('FS_VALIDITY')}</p>`
    )
  } else {
    parts.push(`<div style="height: 16px; line-height: 16px; font-size: 0">&nbsp;</div>`)
  }

  parts.push(ctaButton('manrope'))
  return bodyRow(parts.join('\n'), 'BODY — Free Spins', 40)
}

// ── "More at X7" heading — red text between fading red lines ──
function fadeLine(direction: string): string {
  return (
    `<td style="font-size: 0; line-height: 0;">` +
    `<div style="height: 1px; line-height: 1px; font-size: 0; background-color: #5c0b16; background-image: linear-gradient(${direction}, rgba(200, 8, 36, 0) 0%, ${RED} 100%);">&nbsp;</div></td>`
  )
}

function buildHeading(): string {
  return (
    `<!-- MORE AT X7 heading -->\n` +
    `<tr>\n<td class="bv-more-td" style="padding: 28px 36px 20px 36px; background-color: #000000;">` +
    `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="width: 100%"><tr>` +
    fadeLine('90deg') +
    `<td width="1" align="center" style="padding: 0 18px; white-space: nowrap; font-family: ${FM}; font-size: 15px; font-weight: 700; color: ${RED}; text-align: center; text-transform: uppercase; letter-spacing: 3px; line-height: 1.2;">${tok(MORE_HEADING_KEY)}</td>` +
    fadeLine('270deg') +
    `</tr></table>\n</td>\n</tr>\n`
  )
}

// ── Icons thumbnail design: always 3 columns (no @media); labels wrap on phones ──
function iconCell(n: number, v: Record<string, FieldValue>): string {
  const img = `ICON${n}_IMG`
  const link = `ICON${n}_LINK`
  const label = `ICON${n}_LABEL`
  const href = hasText(v[link]) ? tok(link) : ''
  const wrap = (inner: string, style: string) => (href ? `<a href="${href}" target="_blank" style="${style}">${inner}</a>` : inner)
  const image = hasText(v[img])
    ? wrap(
        `<img src="${tok(img)}" alt="" width="64" height="64" style="display: block; width: 64px; height: 64px; margin: 0 auto; border: 0;" />`,
        'text-decoration: none; display: block;'
      )
    : ''
  const text = hasText(v[label])
    ? `<p style="margin: 0; padding-top: 12px; font-family: ${FM}; font-size: 14px; font-weight: 700; color: #ffffff; text-align: center; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.3; ${BREAK}">` +
      wrap(tok(label), 'color: #ffffff; text-decoration: none;') +
      `</p>`
    : ''
  return `<td width="33%" align="center" valign="top" style="width: 33.33%; padding: 0 4px; text-align: center;">${image}${text}</td>`
}

function buildIcons(v: Record<string, FieldValue>): string {
  return (
    `<!-- ICONS — 3 across at every width -->\n` +
    `<tr>\n<td class="bv-icons-td" style="padding: 20px 20px 28px 20px; background-color: #000000;">` +
    `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="width: 100%; table-layout: fixed;"><tr>` +
    ICON_SLOTS.map((n) => iconCell(n, v)).join('') +
    `</tr></table>\n</td>\n</tr>`
  )
}

// Optional phone extras — the layout is already correct without them
const MOBILE_EXTRAS =
  `<style type="text/css">\n` +
  `@media only screen and (max-width: 620px) {\n` +
  `  .bv-td { padding: 30px 24px 18px 24px !important; }\n` +
  `  .bv-more-td { padding-left: 24px !important; padding-right: 24px !important; }\n` +
  `  .bv-cta { width: 100% !important; }\n` +
  `  .bv-cta-a { display: block !important; }\n` +
  `  .bv-icons-td { padding: 18px 12px 24px 12px !important; }\n` +
  `}\n` +
  `</style>\n`

const strip = (html: string, start: string, end: string) => html.split(start).join('').split(end).join('')

// ─────────────────────────────────────────────
// Public entry point. Run BEFORE token injection.
//   - no markers         → html returned untouched (every other master)
//   - default settings   → markers stripped only (byte-identical to the pre-marker file)
//   - any other choice   → region(s) replaced + optional phone extras in <head>
// ─────────────────────────────────────────────

export function applyV2Layouts(
  html: string,
  enValues: Record<string, FieldValue> | undefined,
  langValues: Record<string, FieldValue> | undefined
): string {
  const hasBody = hasBodyLayoutMarkers(html)
  const hasThumbs = hasThumbLayoutMarkers(html)
  if (!hasBody && !hasThumbs) return html

  const s = parseLayoutSettings(enValues)
  const v = langValues ?? {}
  let out = html
  let changed = false

  if (hasBody) {
    if (s.body === 'classic') {
      out = strip(out, V2_BODY_START, V2_BODY_END)
    } else {
      const row = s.body === 'welcome' ? buildWelcome(v, s.align) : buildSpins(v, s.align, s.games)
      out = out.replace(BODY_REGION_RE, () => row)
      changed = true
    }
  }

  if (hasThumbs) {
    const heading = s.heading && hasText(v[MORE_HEADING_KEY]) ? buildHeading() : ''
    if (s.thumbs === 'icons') {
      out = out.replace(THUMBS_REGION_RE, () => heading + buildIcons(v))
      changed = true
    } else if (heading) {
      out = out.replace(V2_THUMBS_START, () => heading)
      out = out.split(V2_THUMBS_END).join('')
      changed = true
    } else {
      out = strip(out, V2_THUMBS_START, V2_THUMBS_END)
    }
  }

  if (changed) out = out.replace(/<\/head>/i, () => `${MOBILE_EXTRAS}</head>`)
  return out
}
