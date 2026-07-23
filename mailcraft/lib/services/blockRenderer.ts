// ─────────────────────────────────────────────
// BLOCK RENDERER — turns a CustomBlock into email-safe HTML.
//
// Sections in master templates are groups of <tr> rows inside a shared <tbody>
// (max-width ~560px). Blocks are injected BETWEEN sections, so every block must
// render as one <tr>…</tr> row to remain a valid sibling. Do not emit a bare
// <table> or <div> at the top level of a block.
//
// Sanitization mirrors renderService.injectEditableTokens:
//   - text (richtext html)  → injected as-is (trusted rich-text editor output)
//   - image src / links     → sanitizeUrl (http/https only)
//   - alt / button label    → escapeHtml
// On the client preview path sanitize=false (matches existing clientRender,
// which injects raw values); on the server export path sanitize=true.
// ─────────────────────────────────────────────

import type { CustomBlock, BlockContent, BlockProps } from '@/lib/types/blocks'
import type { Language } from '@/lib/types/template'
import { escapeHtml, sanitizeUrl } from '@/lib/utils/escapeHtml'

// Matches the master content table max-width; images are clamped to this.
const CONTENT_WIDTH = 560

export interface RenderBlockOptions {
  brand?: string
  sanitize?: boolean
  // Columns resolve their child blocks (by id) through this — set by renderBlocksById.
  resolveBlock?: (id: string) => CustomBlock | undefined
  // Max content width available to a block — columns pass their per-column width so
  // child images clamp to it (otherwise Outlook uses the wide width attr and overflows).
  maxWidth?: number
  // Horizontal padding override — columns pass a small value so children fill the
  // narrow column instead of shrinking under the default 24px side padding.
  paddingX?: number
}

// ── helpers ──────────────────────────────────

function fontFamily(brand?: string): string {
  return brand === 'X7' ? "'Open Sans', sans-serif" : 'Roboto, sans-serif'
}

// Resolve per-language content, falling back to 'en' then empty.
function contentFor(block: CustomBlock, lang: Language): BlockContent {
  return block.content[lang] ?? block.content.en ?? {}
}

function safeUrl(value: string | undefined, sanitize?: boolean): string {
  const v = value ?? ''
  return sanitize ? sanitizeUrl(v) : v
}

function safeText(value: string | undefined, sanitize?: boolean): string {
  const v = value ?? ''
  return sanitize ? escapeHtml(v) : v
}

// px = horizontal padding; blocks inside a column pass a small value (via
// opts.paddingX) so their content fills the narrow column instead of shrinking.
function paddingStyle(p: BlockProps, px = 24): string {
  const pt = p.paddingTop ?? 16
  const pb = p.paddingBottom ?? 16
  return `padding:${pt}px ${px}px ${pb}px ${px}px;`
}

function bgStyle(p: BlockProps): string {
  return p.backgroundColor ? `background-color:${p.backgroundColor};` : ''
}

// ── per-type renderers ───────────────────────

function renderText(block: CustomBlock, lang: Language, opts: RenderBlockOptions): string {
  const c = contentFor(block, lang)
  const p = block.props
  const align = p.align ?? 'center'
  const size = p.fontSize ?? 15
  const color = p.textColor ?? '#ffffff'
  const font = fontFamily(opts.brand)
  const inner = c.html ?? '' // richtext — injected as-is
  return `<tr><td align="${align}" style="${paddingStyle(p, opts.paddingX)}${bgStyle(p)}">` +
    `<div style="font-family:${font};font-size:${size}px;color:${color};line-height:1.5;text-align:${align};">${inner}</div>` +
    `</td></tr>`
}

function renderImage(block: CustomBlock, lang: Language, opts: RenderBlockOptions): string {
  const c = contentFor(block, lang)
  const p = block.props
  const align = p.align ?? 'center'
  const limit = Math.min(opts.maxWidth ?? CONTENT_WIDTH, CONTENT_WIDTH)
  const width = Math.min(p.width ?? limit, limit)
  const src = safeUrl(c.src, opts.sanitize)
  const alt = safeText(c.alt, opts.sanitize)
  const href = safeUrl(c.href, opts.sanitize)
  const marginAuto = align === 'center' ? 'margin:0 auto;' : ''
  const img = `<img src="${src}" alt="${alt}" width="${width}" style="display:block;width:100%;max-width:${width}px;height:auto;border:0;${marginAuto}" />`
  const wrapped = href ? `<a href="${href}" target="_blank">${img}</a>` : img
  return `<tr><td align="${align}" style="${paddingStyle(p, opts.paddingX)}${bgStyle(p)}">${wrapped}</td></tr>`
}

function renderButton(block: CustomBlock, lang: Language, opts: RenderBlockOptions): string {
  const c = contentFor(block, lang)
  const p = block.props
  const align = p.align ?? 'center'
  const btnColor = p.buttonColor ?? '#ef5e5e'
  const txtColor = p.buttonTextColor ?? '#ffffff'
  const radius = p.borderRadius ?? 4
  const font = fontFamily(opts.brand)
  const label = safeText(c.label, opts.sanitize)
  const href = safeUrl(c.href, opts.sanitize)
  const margin = align === 'center' ? '0 auto' : '0'
  return `<tr><td align="${align}" style="${paddingStyle(p, opts.paddingX)}${bgStyle(p)}">` +
    `<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin:${margin};"><tr>` +
    `<td align="center" bgcolor="${btnColor}" style="border-radius:${radius}px;">` +
    `<a href="${href}" target="_blank" style="display:inline-block;padding:12px 28px;font-family:${font};font-size:15px;font-weight:700;color:${txtColor};text-decoration:none;border-radius:${radius}px;">${label}</a>` +
    `</td></tr></table></td></tr>`
}

function renderDivider(block: CustomBlock, opts: RenderBlockOptions): string {
  const p = block.props
  const color = p.lineColor ?? '#333333'
  const thickness = p.lineThickness ?? 1
  return `<tr><td style="${paddingStyle(p, opts.paddingX)}${bgStyle(p)}">` +
    `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0"><tr>` +
    `<td style="border-top:${thickness}px solid ${color};font-size:0;line-height:0;">&nbsp;</td>` +
    `</tr></table></td></tr>`
}

function renderSpacer(block: CustomBlock): string {
  const p = block.props
  const h = p.height ?? 24
  return `<tr><td style="height:${h}px;line-height:${h}px;font-size:0;${bgStyle(p)}">&nbsp;</td></tr>`
}

// COLUMNS (Phase 9) — 2–3 side-by-side columns, each holding any child blocks
// (text/image/button/divider/spacer), that stack to full width on mobile WITHOUT
// a media query. Uses the fluid-hybrid pattern: inline-block <div>s that wrap when
// the container is too narrow (Gmail mobile), wrapped in MSO conditional ghost
// tables so Outlook (which ignores inline-block) keeps them in a real table.
// font-size:0 on the parent kills the whitespace gap between the divs.
//
// Child blocks are referenced by id (block.columns[colIndex] = child ids) and
// resolved via opts.resolveBlock; each renders as its own <tr>, so a column is
// just <table>{child rows}</table>. Recursion is bounded — the palette never
// offers 'columns' inside a column, so there are no columns-in-columns.
function renderColumns(block: CustomBlock, lang: Language, opts: RenderBlockOptions): string {
  const p = block.props
  // count 1 = a full-width single-column "group" (used by the card presets so the
  // stack is one layout item); 2 = side-by-side; 3 supported by data, not the UI.
  const count = Math.min(Math.max(p.columnCount ?? 2, 1), 3)
  const gap = p.columnGap ?? 16
  const halfGap = Math.round(gap / 2)
  const padX = 6 // small side padding so columns use the full width (like thumbnails)
  const perColMax = Math.floor((CONTENT_WIDTH - padX * 2 - gap * (count - 1)) / count)
  const msoPct = (100 / count).toFixed(count === 3 ? 2 : 0)
  const resolve = opts.resolveBlock
  // Multi-column: children fill the narrow column (no side padding, images clamped).
  // Single-column group: children render like normal full-width blocks (own padding).
  const childOpts: RenderBlockOptions =
    count === 1 ? opts : { ...opts, paddingX: 0, maxWidth: Math.max(perColMax - gap, 80) }

  const columnIds = block.columns ?? []

  const renderColumnBody = (ids: string[]): string => {
    const rows = ids
      .map((id) => (resolve ? resolve(id) : undefined))
      .filter((b): b is CustomBlock => !!b && b.type !== 'columns') // guard nesting
      .map((child) => renderBlock(child, lang, childOpts))
      .join('')
    // Empty column still needs a cell so the layout holds its shape.
    return `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">${rows || '<tr><td style="font-size:0;line-height:0;">&nbsp;</td></tr>'}</table>`
  }

  let cols = ''
  for (let i = 0; i < count; i++) {
    cols +=
      `<!--[if mso]><td width="${msoPct}%" valign="top" style="padding:0 ${halfGap}px;"><![endif]-->` +
      `<div style="display:inline-block;width:100%;max-width:${perColMax}px;vertical-align:top;">` +
      `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0"><tr>` +
      `<td style="padding:0 ${halfGap}px;">${renderColumnBody(columnIds[i] ?? [])}</td>` +
      `</tr></table></div>` +
      `<!--[if mso]></td><![endif]-->`
  }

  return `<tr><td align="center" style="${paddingStyle(p, padX)}${bgStyle(p)}font-size:0;">` +
    `<!--[if mso]><table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0"><tr><![endif]-->` +
    cols +
    `<!--[if mso]></tr></table><![endif]-->` +
    `</td></tr>`
}

// ── public API ───────────────────────────────

export function renderBlock(block: CustomBlock, lang: Language, opts: RenderBlockOptions = {}): string {
  switch (block.type) {
    case 'text':    return renderText(block, lang, opts)
    case 'image':   return renderImage(block, lang, opts)
    case 'button':  return renderButton(block, lang, opts)
    case 'divider': return renderDivider(block, opts)
    case 'spacer':  return renderSpacer(block)
    case 'columns': return renderColumns(block, lang, opts)
    default:        return ''
  }
}

// Render every block once, keyed by id, for a given language.
// composeLayout looks blocks up by id as it walks the layout order.
export function renderBlocksById(
  blocks: CustomBlock[],
  lang: Language,
  opts: RenderBlockOptions = {}
): Record<string, string> {
  // Resolver so columns can render their child blocks (which live in this same
  // flat list but aren't in layoutOrder).
  const byId = new Map(blocks.map((b) => [b.id, b]))
  const withResolver: RenderBlockOptions = { ...opts, resolveBlock: (id) => byId.get(id) }

  const map: Record<string, string> = {}
  for (const block of blocks) {
    map[block.id] = renderBlock(block, lang, withResolver)
  }
  return map
}
