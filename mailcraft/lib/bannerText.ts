import { z } from 'zod'
import { sanitizeUrl } from '@/lib/utils/escapeHtml'
import type { FieldValue } from '@/lib/types/template'

// ─────────────────────────────────────────────
// BANNER TEXT BOX — live title/sub over the banner image (copy no longer baked
// into the artwork). Pure string work, shared by the server render, clientRender
// and the editor canvas.
//
// Masters opt in by wrapping their banner row in BANNER:START/END markers
// (adjacent to the existing markup, so stripping them is byte-exact). When the
// box is off — or a master has no markers — the output is identical to before.
//
// Email-safe technique (no @media dependency — Gmail/CIO ignore it):
//   - the user's banner becomes the cell background (+ Outlook VML rect);
//   - row height comes from a transparent spacer with a quarter-banner aspect
//     ratio (1125×2024 vs 1125×506), so it scales exactly like the banner;
//   - the text sits in a 50% column next to it, vertically aligned.
// One font size everywhere (no @media upscale), so the editor preview matches Gmail.
// ─────────────────────────────────────────────

export const BANNER_MARKER_START = '<!-- BANNER:START -->'
export const BANNER_MARKER_END = '<!-- BANNER:END -->'
const BANNER_REGION_RE = /<!-- BANNER:START -->[\s\S]*?<!-- BANNER:END -->/g

// Hosted on CIO (transparent PNG, 1125×2024 = quarter of a 1125×506 banner)
export const BANNER_SPACER_URL =
  'https://userimg-assets.customeriomail.com/images/client-env-110039/01M5H77ET45TTG2C669W32T2TF.png'

// Desktop banner box: 560 × 506/1125 ≈ 252 (Outlook VML + spacer size attrs)
const BANNER_W = 560
const BANNER_H = 252

export const BANNER_TITLE_KEY = 'BANNER_TITLE'
export const BANNER_SUB_KEY = 'BANNER_SUB'

// Settings live as meta-keys on fieldValues.en (same pattern as _bodyAlignment)
export const BANNER_META_KEYS = {
  box: '_bannerBox',
  align: '_bannerAlign',
  titleColor: '_bannerTitleColor',
  subColor: '_bannerSubColor',
  customSize: '_bannerCustomSize',
  titleSize: '_bannerTitleSize',
  subSize: '_bannerSubSize',
} as const

export const BANNER_BOXES = ['off', 'left', 'center', 'right'] as const
export const BANNER_ALIGNS = ['left', 'center', 'right', 'bottom'] as const
export type BannerBox = (typeof BANNER_BOXES)[number]
export type BannerAlign = (typeof BANNER_ALIGNS)[number]

export interface BannerTextSettings {
  box: BannerBox
  align: BannerAlign
  titleColor: string // #RRGGBB
  subColor: string // #RRGGBB
  customSize: boolean
  titleSize: number // mobile px (used only when customSize)
  subSize: number // mobile px (used only when customSize)
}

// Custom size ranges (mobile px). Desktop follows the brand's ratio.
export const BANNER_TITLE_SIZE_RANGE = { min: 16, max: 40 } as const
export const BANNER_SUB_SIZE_RANGE = { min: 10, max: 20 } as const
export const BANNER_DEFAULT_COLOR = '#FFFFFF'

// ─────────────────────────────────────────────
// Per-brand typography (fonts match each master; sizes tuned in the POC so the
// default copy fits a 320px phone without @media)
// ─────────────────────────────────────────────

interface BannerTextStyle {
  font: string
  weight: number
  size: number // px — same on every client and screen size
}

export interface BannerBrandStyle {
  title: BannerTextStyle & { upper: boolean; spacing: string; lineHeight: number }
  sub: BannerTextStyle
  accent: string // swatch in the editor
  titleLimit: number // soft character guide (warning only)
  subLimit: number
}

const ROBOTO = 'Roboto, Arial, sans-serif'
const OPEN_SANS = "'Open Sans', Arial, sans-serif"
const MANROPE = "'Manrope', 'Helvetica Neue', Helvetica, Arial, sans-serif"
const BEBAS = "'Bebas Neue', Impact, 'Arial Narrow', sans-serif"

const STAKES_STYLE: BannerBrandStyle = {
  title: { font: ROBOTO, weight: 700, size: 22, upper: false, spacing: '0', lineHeight: 1.15 },
  sub: { font: ROBOTO, weight: 400, size: 15 },
  accent: '#EF5E5E',
  titleLimit: 20,
  subLimit: 60,
}

const BANNER_BRAND_STYLES: Record<string, BannerBrandStyle> = {
  X7_V2: {
    title: { font: BEBAS, weight: 400, size: 28, upper: true, spacing: '0.5px', lineHeight: 1 },
    sub: { font: MANROPE, weight: 500, size: 15 },
    accent: '#C80824',
    titleLimit: 20,
    subLimit: 60,
  },
  X7: {
    title: { font: OPEN_SANS, weight: 700, size: 22, upper: false, spacing: '0', lineHeight: 1.15 },
    sub: { font: OPEN_SANS, weight: 400, size: 15 },
    accent: '#FF3263',
    titleLimit: 20,
    subLimit: 60,
  },
  STAKES: STAKES_STYLE,
  STAKES_CASINO: STAKES_STYLE,
}

export function getBannerBrandStyle(brand: string): BannerBrandStyle {
  return BANNER_BRAND_STYLES[brand] ?? STAKES_STYLE
}

// ─────────────────────────────────────────────
// Settings parsing — the security boundary for everything that is NOT a
// {{TOKEN}} (colours/sizes go straight into inline styles). Invalid → default.
// ─────────────────────────────────────────────

const HEX_RE = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i

export function normalizeHex(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const m = HEX_RE.exec(value.trim())
  if (!m) return null
  const hex = m[1].length === 3 ? m[1].replace(/./g, '$&$&') : m[1]
  return `#${hex.toUpperCase()}`
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === 'string' ? Number.parseInt(value, 10) : NaN
  if (!Number.isFinite(n)) return fallback
  return Math.min(Math.max(n, min), max)
}

const boxSchema = z.enum(BANNER_BOXES).catch('off')
const alignSchema = z.enum(BANNER_ALIGNS).catch('left')

export function parseBannerSettings(
  enValues: Record<string, FieldValue> | undefined,
  brand: string
): BannerTextSettings {
  const v = enValues ?? {}
  const style = getBannerBrandStyle(brand)
  return {
    box: boxSchema.parse(v[BANNER_META_KEYS.box]),
    align: alignSchema.parse(v[BANNER_META_KEYS.align]),
    titleColor: normalizeHex(v[BANNER_META_KEYS.titleColor]) ?? BANNER_DEFAULT_COLOR,
    subColor: normalizeHex(v[BANNER_META_KEYS.subColor]) ?? BANNER_DEFAULT_COLOR,
    customSize: v[BANNER_META_KEYS.customSize] === 'true',
    titleSize: clampInt(v[BANNER_META_KEYS.titleSize], BANNER_TITLE_SIZE_RANGE.min, BANNER_TITLE_SIZE_RANGE.max, style.title.size),
    subSize: clampInt(v[BANNER_META_KEYS.subSize], BANNER_SUB_SIZE_RANGE.min, BANNER_SUB_SIZE_RANGE.max, style.sub.size),
  }
}

// Settings → meta-key strings for fieldValues.en
export function bannerSettingsToMeta(s: BannerTextSettings): Record<string, string> {
  return {
    [BANNER_META_KEYS.box]: s.box,
    [BANNER_META_KEYS.align]: s.align,
    [BANNER_META_KEYS.titleColor]: s.titleColor,
    [BANNER_META_KEYS.subColor]: s.subColor,
    [BANNER_META_KEYS.customSize]: s.customSize ? 'true' : 'false',
    [BANNER_META_KEYS.titleSize]: String(s.titleSize),
    [BANNER_META_KEYS.subSize]: String(s.subSize),
  }
}

// Effective px sizes (brand default, or the custom size when enabled)
export function resolveBannerSizes(s: BannerTextSettings, brand: string) {
  const style = getBannerBrandStyle(brand)
  return s.customSize
    ? { title: s.titleSize, sub: s.subSize }
    : { title: style.title.size, sub: style.sub.size }
}

export function hasBannerMarkers(html: string): boolean {
  return html.includes(BANNER_MARKER_START) && html.includes(BANNER_MARKER_END)
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

// URL safe inside an inline CSS url('…') — sanitizeUrl leaves ' ( ) unencoded
function cssSafeUrl(value: unknown): string {
  if (typeof value !== 'string') return ''
  return sanitizeUrl(value.trim())
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/\\/g, '%5C')
}

// Fallback cell colour (images blocked / Gmail app with non-Google accounts):
// dark text → white cell, light text → black cell, so the copy stays readable.
function fallbackBg(textColor: string): string {
  const n = Number.parseInt(textColor.slice(1), 16)
  const lin = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  const lum = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255)
  return lum > 0.18 ? '#000000' : '#FFFFFF'
}

function hasText(value: FieldValue | undefined): boolean {
  return typeof value === 'string' && value.trim() !== ''
}

// ─────────────────────────────────────────────
// Row markup (mirrors the approved POC: Approved Emails/X7 Casino V2/poc)
// Emits {{BANNER_*}} tokens so the normal injection pass escapes/sanitizes them.
// ─────────────────────────────────────────────

function buildBannerRow(
  s: BannerTextSettings,
  brand: string,
  values: Record<string, FieldValue>
): string {
  const style = getBannerBrandStyle(brand)
  const sizes = resolveBannerSizes(s, brand)
  const bgUrl = cssSafeUrl(values.BANNER_IMG)
  const showTitle = hasText(values[BANNER_TITLE_KEY])
  const showSub = hasText(values[BANNER_SUB_KEY])
  const bg = fallbackBg(showTitle || !showSub ? s.titleColor : s.subColor)

  const align = s.align === 'left' || s.align === 'right' ? s.align : 'center'
  const valign = s.align === 'bottom' ? 'bottom' : 'middle'
  // 6px towards the middle; the banner's outer edge gets a % gap column instead
  // (scales with the screen without @media: ~39px desktop, ~22px on a 320px phone)
  const pad = s.box === 'left' ? '0 6px 0 0' : s.box === 'right' ? '0 0 0 6px' : '0 6px'
  const edgeGap = s.box === 'center'
    ? ''
    : `<td width="14%" style="width: 14%; padding: 0; font-size: 0; line-height: 0">&nbsp;</td>`
  const t = style.title
  const sb = style.sub

  const titleSpan = showTitle
    ? `<span style="display: block; font-family: ${t.font}; font-size: ${sizes.title}px; font-weight: ${t.weight}; line-height: ${t.lineHeight}; letter-spacing: ${t.spacing};${t.upper ? ' text-transform: uppercase;' : ''} color: ${s.titleColor}">{{${BANNER_TITLE_KEY}}}</span>`
    : ''
  const subSpan = showSub
    ? `<span style="display: block; padding-top: ${showTitle ? '5px' : '0'}; font-family: ${sb.font}; font-size: ${sizes.sub}px; font-weight: ${sb.weight}; line-height: 1.35; color: ${s.subColor}">{{${BANNER_SUB_KEY}}}</span>`
    : ''
  // Bottom alignment: fixed gap row under the text
  const bottomGap = valign === 'bottom'
    ? `<tr><td${edgeGap ? ' colspan="2"' : ''} height="14" style="height: 14px; padding: 0; font-size: 0; line-height: 0">&nbsp;</td></tr>`
    : ''

  const textInner =
    `<td align="${align}" valign="${valign}" style="padding: ${pad}; text-align: ${align}; word-wrap: break-word; overflow-wrap: break-word; word-break: break-word">` +
    `<a href="{{BANNER_LINK}}" style="display: block; color: ${s.titleColor}; text-decoration: none">${titleSpan}${subSpan}</a>` +
    `</td>`

  const textCell =
    `<td width="50%" valign="${valign}" style="width: 50%; padding: 0">` +
    `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="width: 100%; table-layout: fixed">` +
    `<tr>${s.box === 'right' ? textInner + edgeGap : edgeGap + textInner}</tr>` +
    `${bottomGap}</table></td>`

  // pct = column share of the banner; the quarter-aspect spacer is shown at 100%
  // of a 25% column or 50% of a 50% column → always exactly the banner height.
  const spacerCell = (pct: 25 | 50) =>
    `<td width="${pct}%" valign="middle" style="width: ${pct}%; padding: 0; font-size: 0; line-height: 0">` +
    `<a href="{{BANNER_LINK}}"><img src="${BANNER_SPACER_URL}" alt="" width="${BANNER_W / 4}" height="${BANNER_H}" style="display: block; width: ${pct === 25 ? '100%' : '50%'}; height: auto; border: 0" /></a>` +
    `</td>`

  const cells =
    s.box === 'left' ? textCell + spacerCell(50)
    : s.box === 'right' ? spacerCell(50) + textCell
    : spacerCell(25) + textCell + spacerCell(25)

  return (
    `<tr>\n` +
    `<td align="center" valign="middle" class="banner-td" background="{{BANNER_IMG}}" bgcolor="${bg}" style="padding: 0; background-color: ${bg}; background-image: url('${bgUrl}'); background-size: cover; background-position: center center; background-repeat: no-repeat">\n` +
    `<!--[if gte mso 9]><v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:${BANNER_W}px;height:${BANNER_H}px;"><v:fill type="frame" src="{{BANNER_IMG}}" color="${bg}" /><v:textbox inset="0,0,0,0"><![endif]-->\n` +
    `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="width: 100%; table-layout: fixed"><tr>${cells}</tr></table>\n` +
    `<!--[if gte mso 9]></v:textbox></v:rect><![endif]-->\n` +
    `</td>\n` +
    `</tr>`
  )
}

// Outlook (VML) renders at 96 DPI and allows PNG fills
const MSO_SETTINGS =
  `<!--[if gte mso 9]><xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->\n`

// ─────────────────────────────────────────────
// Public entry point. Run BEFORE token injection.
//   - no markers  → html returned untouched
//   - box 'off'   → markers stripped only (byte-identical to the pre-marker file)
//   - box on      → banner region replaced; VML namespaces + Outlook settings added
// ─────────────────────────────────────────────

export function applyBannerText(
  html: string,
  brand: string,
  enValues: Record<string, FieldValue> | undefined,
  langValues: Record<string, FieldValue> | undefined
): string {
  if (!hasBannerMarkers(html)) return html

  const settings = parseBannerSettings(enValues, brand)
  if (settings.box === 'off') {
    return html.split(BANNER_MARKER_START).join('').split(BANNER_MARKER_END).join('')
  }

  const row = buildBannerRow(settings, brand, langValues ?? {})
  let out = html.replace(BANNER_REGION_RE, () => row)

  // VML needs its namespaces on <html>
  out = out.replace(/<html\b([^>]*)>/i, (tag, attrs: string) =>
    /xmlns:v=/i.test(attrs)
      ? tag
      : `<html${attrs} xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">`
  )
  out = out.replace(/<\/head>/i, () => `${MSO_SETTINGS}</head>`)
  return out
}
